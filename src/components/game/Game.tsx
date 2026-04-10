'use client';

import { useState, useMemo, useEffect } from 'react';
import ChessBoard from './ChessBoard';
import GameInfoPanel from './GameInfoPanel';
import { createInitialBoard, getValidMoves } from '@/lib/game/logic';
import type { GameState, Move, Square, FormattedLastMove, PlayerId, Board } from '@/lib/game/types';
import { PLAYERS, PIECE_EMOJIS, BOARD_SIZE } from '@/lib/game/constants';
import { fetchAICommentary } from '@/app/actions';
import { useToast } from "@/hooks/use-toast"
import { produce } from 'immer';

const initialGameState: GameState = {
  board: createInitialBoard(),
  currentPlayerIndex: 0,
  players: PLAYERS,
  eliminatedPlayerIds: [],
  winner: null,
  lastMove: null,
  enPassantTarget: null,
};

function getRotatedBoard(board: Board, playerId: PlayerId): Board {
  const size = board.length;
  // Deep copy to avoid mutation issues with Immer proxies
  const newBoard: Board = JSON.parse(JSON.stringify(board)); 

  const rotate90 = (b: Board): Board => {
    const rotated = b[0].map((_, colIndex) => b.map(row => row[colIndex]).reverse());
    return rotated.map((row, rowIndex) => row.map((sq, colIndex) => ({...sq, row: rowIndex, col: colIndex})));
  };
  const rotate180 = (b: Board) => rotate90(rotate90(b));
  const rotate270 = (b: Board) => rotate90(rotate180(b));

  switch (playerId) {
    case 'Red':
      return newBoard; 
    case 'Yellow':
      return rotate90(newBoard);
    case 'Blue':
      return rotate180(newBoard);
    case 'Green':
      return rotate270(newBoard);
    default:
      return newBoard;
  }
}

function getOriginalCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
  switch (playerId) {
    case 'Red': // 0
      return { row, col };
    case 'Yellow': // 90
      return { row: size - 1 - col, col: row };
    case 'Blue': // 180
      return { row: size - 1 - row, col: size - 1 - col };
    case 'Green': // 270
      return { row: col, col: size - 1 - row };
    default:
      return { row, col };
  }
}

function getRotatedCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
    if (row === -1 || col === -1) return {row, col};
    switch (playerId) {
        case 'Red': // 0
            return { row, col };
        case 'Yellow': // 90
            return { row: col, col: size - 1 - row };
        case 'Blue': // 180
            return { row: size - 1 - row, col: size - 1 - col };
        case 'Green': // 270
            return { row: size - 1 - col, col: row };
        default:
            return { row, col };
    }
}


export default function Game() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [aiCommentary, setAiCommentary] = useState<string>('The game is about to begin. Good luck!');
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const { toast } = useToast();

  const { board, currentPlayerIndex, players, eliminatedPlayerIds, winner, lastMove, enPassantTarget } = gameState;
  const currentPlayer = useMemo(() => players[currentPlayerIndex], [players, currentPlayerIndex]);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getValidMoves(selectedSquare.row, selectedSquare.col, gameState);
  }, [selectedSquare, gameState]);

  useEffect(() => {
    if (winner) {
        toast({
            title: "Game Over!",
            description: `${players.find(p => p.id === winner)?.name} is victorious!`,
        })
    }
  }, [winner, players, toast]);

  const displayBoard = useMemo(() => getRotatedBoard(board, currentPlayer.id), [board, currentPlayer.id]);
  const displaySelectedSquare = useMemo(() => {
    if (!selectedSquare) return null;
    return getRotatedCoords(selectedSquare.row, selectedSquare.col, currentPlayer.id, BOARD_SIZE);
  }, [selectedSquare, currentPlayer.id]);
  const displayValidMoves = useMemo(() => {
      return validMoves.map(move => getRotatedCoords(move.row, move.col, currentPlayer.id, BOARD_SIZE));
  }, [validMoves, currentPlayer.id]);
  const displayLastMove = useMemo(() => {
      if (!lastMove) return null;
      return {
          from: getRotatedCoords(lastMove.from.row, lastMove.from.col, currentPlayer.id, BOARD_SIZE),
          to: getRotatedCoords(lastMove.to.row, lastMove.to.col, currentPlayer.id, BOARD_SIZE),
      }
  }, [lastMove, currentPlayer.id]);

  const handleSquareClick = async (row: number, col: number) => {
    const { row: originalRow, col: originalCol } = getOriginalCoords(row, col, currentPlayer.id, BOARD_SIZE);
    
    if (winner) return;

    const clickedSquare = board[originalRow][originalCol];
    if (selectedSquare) {
      const isValidMove = validMoves.some(move => move.row === originalRow && move.col === originalCol);

      if (isValidMove) {
        await makeMove(selectedSquare, { row: originalRow, col: originalCol });
      } else {
        setSelectedSquare(
          clickedSquare.piece && clickedSquare.piece.player === currentPlayer.id
            ? { row: originalRow, col: originalCol }
            : null
        );
      }
    } else if (clickedSquare.piece && clickedSquare.piece.player === currentPlayer.id) {
      setSelectedSquare({ row: originalRow, col: originalCol });
    }
  };

  const makeMove = async (from: { row: number, col: number }, to: { row: number, col: number }) => {
    const fromPiece = board[from.row][from.col].piece;
    if (!fromPiece) return;

    let capturedPiece = board[to.row][to.col].piece;
    const move: Move = { from, to };

    const isEnPassant = fromPiece.type === 'Pawn' && !!enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col;
    
    if (isEnPassant) {
        let capturedPawnPos: { row: number, col: number } | null = null;
        if (fromPiece.player === 'Red') capturedPawnPos = { row: to.row + 1, col: to.col };
        else if (fromPiece.player === 'Blue') capturedPawnPos = { row: to.row - 1, col: to.col };
        else if (fromPiece.player === 'Yellow') capturedPawnPos = { row: to.row, col: to.col - 1 };
        else if (fromPiece.player === 'Green') capturedPawnPos = { row: to.row, col: to.col + 1 };
        
        if (capturedPawnPos && board[capturedPawnPos.row]?.[capturedPawnPos.col]?.piece) {
            capturedPiece = board[capturedPawnPos.row][capturedPawnPos.col].piece;
        }
    }

    const formattedLastMove: FormattedLastMove = {
        piece: PIECE_EMOJIS[fromPiece.player][fromPiece.type],
        fromRow: from.row,
        fromCol: from.col,
        toRow: to.row,
        toCol: to.col,
        capturedPiece: capturedPiece ? PIECE_EMOJIS[capturedPiece.player][capturedPiece.type] : undefined,
    };

    const nextState = produce(gameState, draft => {
        const movingPiece = { ...draft.board[from.row][from.col].piece!, hasMoved: true };
        draft.board[to.row][to.col].piece = movingPiece;
        draft.board[from.row][from.col].piece = null;
        draft.lastMove = move;

        if (fromPiece.type === 'Pawn' && (Math.abs(from.row - to.row) === 2 || Math.abs(from.col - to.col) === 2)) {
            draft.enPassantTarget = { row: (from.row + to.row) / 2, col: (from.col + to.col) / 2 };
        } else {
            draft.enPassantTarget = null;
        }

        if (isEnPassant) {
          let capturedPawnPos: { row: number, col: number } | null = null;
          if (fromPiece.player === 'Red') capturedPawnPos = { row: to.row + 1, col: to.col };
          else if (fromPiece.player === 'Blue') capturedPawnPos = { row: to.row - 1, col: to.col };
          else if (fromPiece.player === 'Yellow') capturedPawnPos = { row: to.row, col: to.col - 1 };
          else if (fromPiece.player === 'Green') capturedPawnPos = { row: to.row, col: to.col + 1 };
          if(capturedPawnPos) {
            draft.board[capturedPawnPos.row][capturedPawnPos.col].piece = null;
          }
        }

        if (fromPiece.type === 'King' && (Math.abs(from.col - to.col) === 2 || Math.abs(from.row - to.row) === 2)) {
          // Horizontal
          if (Math.abs(from.col - to.col) === 2) {
              const rookFromCol = to.col > from.col ? 10 : 3;
              const rookToCol = to.col > from.col ? to.col - 1 : to.col + 1;
              const rook = draft.board[from.row][rookFromCol]?.piece;
              if (rook) {
                  draft.board[from.row][rookToCol].piece = { ...rook, hasMoved: true };
                  draft.board[from.row][rookFromCol].piece = null;
              }
          }
          // Vertical
          if (Math.abs(from.row - to.row) === 2) {
              const rookFromRow = to.row > from.row ? 10 : 3;
              const rookToRow = to.row > from.row ? to.row - 1 : to.row + 1;
              const rook = draft.board[rookFromRow][from.col]?.piece;
              if (rook) {
                  draft.board[rookToRow][from.col].piece = { ...rook, hasMoved: true };
                  draft.board[rookFromRow][from.col].piece = null;
              }
          }
        }
        
        if(capturedPiece?.type === 'King'){
          const eliminatedPlayerId = capturedPiece.player;
          if(!draft.eliminatedPlayerIds.includes(eliminatedPlayerId)) {
            draft.eliminatedPlayerIds.push(eliminatedPlayerId);
            toast({
              title: "Player Eliminated!",
              description: `${players.find(p => p.id === eliminatedPlayerId)?.name} has been eliminated.`,
              variant: "destructive",
            });
            for (let r = 0; r < 14; r++) {
              for (let c = 0; c < 14; c++) {
                if (draft.board[r][c].piece && draft.board[r][c].piece!.player === eliminatedPlayerId) {
                  draft.board[r][c].piece = null;
                }
              }
            }
          }
        }

        const activePlayers = players.filter(p => !draft.eliminatedPlayerIds.includes(p.id));
        if (activePlayers.length <= 1) {
            draft.winner = activePlayers[0]?.id || null;
        } else {
            let nextPlayerIndex = (draft.currentPlayerIndex + 1) % players.length;
            while (draft.eliminatedPlayerIds.includes(players[nextPlayerIndex].id)) {
                nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
            }
            draft.currentPlayerIndex = nextPlayerIndex;
        }
    });

    setGameState(nextState);
    setSelectedSquare(null);
    setAiCommentary('');
    setIsAIThinking(true);

    const commentary = await fetchAICommentary({
        boardState: nextState.board.map(r => r.map(s => s.piece ? PIECE_EMOJIS[s.piece.player][s.piece.type] : '')),
        lastMove: formattedLastMove,
        currentPlayerId: currentPlayer.name
    });

    setAiCommentary(commentary);
    setIsAIThinking(false);
  };
  
  const onRestart = () => {
    setGameState(initialGameState);
    setSelectedSquare(null);
    setAiCommentary('The game is about to begin. Good luck!');
    setIsAIThinking(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <ChessBoard
          board={displayBoard}
          onSquareClick={handleSquareClick}
          selectedSquare={displaySelectedSquare}
          validMoves={displayValidMoves}
          lastMove={displayLastMove}
          players={players}
          eliminatedPlayerIds={eliminatedPlayerIds}
        />
      </div>
      <div>
        <GameInfoPanel
          currentPlayer={currentPlayer}
          eliminatedPlayers={eliminatedPlayerIds.map(id => players.find(p => p.id === id)!)}
          winner={winner ? players.find(p => p.id === winner)! : null}
          aiCommentary={aiCommentary}
          isAIThinking={isAIThinking}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
}
