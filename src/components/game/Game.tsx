'use client';

import { useState, useMemo, useEffect } from 'react';
import { produce } from 'immer';
import ChessBoard from './ChessBoard';
import GameInfoPanel from './GameInfoPanel';
import PromotionDialog from './PromotionDialog';
import { createInitialBoard, getValidMoves } from '@/lib/game/logic';
import type { GameState, Move, Piece, PlayerId, Board, PieceType } from '@/lib/game/types';
import { BOARD_SIZE, PLAYERS } from '@/lib/game/constants';
import { useToast } from "@/hooks/use-toast";

const createNewGameState = (): GameState => ({
  board: createInitialBoard(),
  currentPlayerIndex: 0,
  players: PLAYERS,
  eliminatedPlayerIds: [],
  winner: null,
  lastMove: null,
  enPassantTarget: null,
  capturedPieces: {},
});


function getRotatedBoard(board: Board, playerId: PlayerId): Board {
  const size = board.length;
  // Create a deep copy to avoid mutation issues.
  const newBoard: Board = JSON.parse(JSON.stringify(board)); 

  const rotate90 = (b: Board): Board => {
    // A bit of a complex operation to rotate a 2D array and update square coords
    const rotated = b[0].map((_, colIndex) => b.map(row => row[colIndex]).reverse());
    return rotated.map((row, rowIndex) => row.map((sq, colIndex) => ({...sq, row: rowIndex, col: colIndex})));
  };
  const rotate180 = (b: Board) => rotate90(rotate90(b));
  const rotate270 = (b: Board) => rotate90(rotate180(b));

  switch (playerId) {
    case 'Red':
      return newBoard; 
    case 'Yellow':
      return rotate270(newBoard);
    case 'Blue':
      return rotate180(newBoard);
    case 'Green':
      return rotate90(newBoard);
    default:
      return newBoard;
  }
}

function getOriginalCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
  switch (playerId) {
    case 'Red':
      return { row, col };
    case 'Yellow':
      return { row: col, col: size - 1 - row };
    case 'Blue':
      return { row: size - 1 - row, col: size - 1 - col };
    case 'Green':
      return { row: size - 1 - col, col: row };
    default:
      return { row, col };
  }
}

function getRotatedCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
    if (row === -1 || col === -1) return {row, col};
    switch (playerId) {
        case 'Red':
            return { row, col };
        case 'Yellow':
            return { row: size - 1 - col, col: row };
        case 'Blue':
            return { row: size - 1 - row, col: size - 1 - col };
        case 'Green':
            return { row: col, col: size - 1 - row };
        default:
            return { row, col };
    }
}


export default function Game() {
  const [history, setHistory] = useState<GameState[]>([createNewGameState()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const gameState = history[historyIndex];

  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: { row: number; col: number }; to: { row: number; col: number } } | null>(null);
  const { toast } = useToast();

  const { board, currentPlayerIndex, players, eliminatedPlayerIds, winner, lastMove, enPassantTarget, capturedPieces } = gameState;
  const currentPlayer = useMemo(() => players[currentPlayerIndex], [players, currentPlayerIndex]);
  const currentUserPlayerId = currentPlayer.id;

  useEffect(() => {
    if (winner) {
        toast({
            title: "Game Over!",
            description: `${players.find(p => p.id === winner)?.name} is victorious!`,
        })
    } else {
        const prevGameState = history[historyIndex - 1];
        if (prevGameState) {
            const newlyEliminated = eliminatedPlayerIds.filter(id => !prevGameState.eliminatedPlayerIds.includes(id));
            if (newlyEliminated.length > 0) {
                const newlyEliminatedId = newlyEliminated[0];
                const playerName = players.find(p => p.id === newlyEliminatedId)?.name;
                if(playerName) {
                    toast({
                      title: "Player Eliminated!",
                      description: `${playerName} has been eliminated.`,
                      variant: "destructive",
                    });
                }
            }
        }
    }
  }, [winner, eliminatedPlayerIds, players, toast, history, historyIndex]);
  
  useEffect(() => {
    setSelectedSquare(null);
  }, [currentPlayerIndex, historyIndex]);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    // The valid moves should be calculated from original board state
    const moves = getValidMoves(selectedSquare.row, selectedSquare.col, gameState);
    // Then the valid moves should be rotated for display
    return moves.map(move => getRotatedCoords(move.row, move.col, currentUserPlayerId, BOARD_SIZE));
  }, [selectedSquare, gameState, currentUserPlayerId]);

  const displayBoard = useMemo(() => getRotatedBoard(board, currentUserPlayerId), [board, currentUserPlayerId]);
  
  const displaySelectedSquare = useMemo(() => {
    if (!selectedSquare) return null;
    return getRotatedCoords(selectedSquare.row, selectedSquare.col, currentUserPlayerId, BOARD_SIZE);
  }, [selectedSquare, currentUserPlayerId]);

  const displayLastMove = useMemo(() => {
      if (!lastMove) return null;
      return {
          from: getRotatedCoords(lastMove.from.row, lastMove.from.col, currentUserPlayerId, BOARD_SIZE),
          to: getRotatedCoords(lastMove.to.row, lastMove.to.col, currentUserPlayerId, BOARD_SIZE),
      }
  }, [lastMove, currentUserPlayerId]);


  const applyMove = (from: { row: number, col: number }, to: { row: number, col: number }, promotionPieceType: PieceType | null = null) => {
    const fromPiece = gameState.board[from.row][from.col].piece;
    if (!fromPiece) return;

    const nextState = produce(gameState, draft => {
        let capturedPiece: Piece | null = draft.board[to.row][to.col].piece;
        const move: Move = { from, to };
        const isEnPassant = fromPiece.type === 'Pawn' && !!draft.enPassantTarget && to.row === draft.enPassantTarget.row && to.col === draft.enPassantTarget.col;
        
        if (isEnPassant) {
            let capturedPawnPos: { row: number, col: number } | null = null;
            if (fromPiece.player === 'Red') capturedPawnPos = { row: to.row + 1, col: to.col };
            else if (fromPiece.player === 'Blue') capturedPawnPos = { row: to.row - 1, col: to.col };
            else if (fromPiece.player === 'Green') capturedPawnPos = { row: to.row, col: to.col + 1 };
            else if (fromPiece.player === 'Yellow') capturedPawnPos = { row: to.row, col: to.col - 1 };
            if (capturedPawnPos && draft.board[capturedPawnPos.row]?.[capturedPawnPos.col]?.piece) {
                capturedPiece = draft.board[capturedPawnPos.row][capturedPawnPos.col].piece;
            }
        }
        
        const movingPieceInfo = draft.board[from.row][from.col].piece!;
        const movingPiece = {
             ...(promotionPieceType ? { type: promotionPieceType, player: movingPieceInfo.player } : movingPieceInfo),
             hasMoved: true
        };
        draft.board[to.row][to.col].piece = movingPiece;
        draft.board[from.row][from.col].piece = null;
        draft.lastMove = move;

        if (capturedPiece) {
            const capturingPlayerId = fromPiece.player;
            if (!draft.capturedPieces[capturingPlayerId]) {
                draft.capturedPieces[capturingPlayerId] = [];
            }
            draft.capturedPieces[capturingPlayerId]!.push(capturedPiece);
        }

        if (fromPiece.type === 'Pawn' && (Math.abs(from.row - to.row) === 2 || Math.abs(from.col - to.col) === 2)) {
            draft.enPassantTarget = { row: (from.row + to.row) / 2, col: (from.col + to.col) / 2 };
        } else {
            draft.enPassantTarget = null;
        }
        if (isEnPassant) {
          let capturedPawnPos: { row: number, col: number } | null = null;
          if (fromPiece.player === 'Red') capturedPawnPos = { row: to.row + 1, col: to.col };
          else if (fromPiece.player === 'Blue') capturedPawnPos = { row: to.row - 1, col: to.col };
          else if (fromPiece.player === 'Green') capturedPawnPos = { row: to.row, col: to.col + 1 };
          else if (fromPiece.player === 'Yellow') capturedPawnPos = { row: to.row, col: to.col - 1 };
          if(capturedPawnPos) {
            draft.board[capturedPawnPos.row][capturedPawnPos.col].piece = null;
          }
        }
        if (fromPiece.type === 'King' && (Math.abs(from.col - to.col) === 2 || Math.abs(from.row - to.row) === 2)) {
          if (Math.abs(from.col - to.col) === 2) { // Horizontal castling
              const rookFromCol = to.col > from.col ? 10 : 3;
              const rookToCol = to.col > from.col ? to.col - 1 : to.col + 1;
              const rook = draft.board[from.row][rookFromCol]?.piece;
              if (rook) {
                  draft.board[from.row][rookToCol].piece = { ...rook, hasMoved: true };
                  draft.board[from.row][rookFromCol].piece = null;
              }
          }
          if (Math.abs(from.row - to.row) === 2) { // Vertical castling
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
            for (let r = 0; r < 14; r++) {
              for (let c = 0; c < 14; c++) {
                if (draft.board[r][c].piece && draft.board[r][c].piece!.player === eliminatedPlayerId) {
                  draft.board[r][c].piece = null;
                }
              }
            }
          }
        }

        const activePlayers = draft.players.filter(p => !draft.eliminatedPlayerIds.includes(p.id));

        if (activePlayers.length <= 1) {
            draft.winner = activePlayers[0]?.id || null;
        } else {
            let nextPlayerIndex = draft.currentPlayerIndex;
            do {
                nextPlayerIndex = (nextPlayerIndex + 1) % draft.players.length;
            } while (draft.eliminatedPlayerIds.includes(draft.players[nextPlayerIndex].id));
            draft.currentPlayerIndex = nextPlayerIndex;
        }
    });

    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, nextState]);
    setHistoryIndex(newHistory.length);

    setSelectedSquare(null);
  };
  
  const handleAttemptMove = (from: { row: number, col: number }, to: { row: number, col: number }) => {
    const fromPiece = gameState.board[from.row][from.col].piece;
    if (!fromPiece || fromPiece.player !== currentPlayer.id) {
      setSelectedSquare(null);
      return;
    }

    const validMovesForPiece = getValidMoves(from.row, from.col, gameState);
    const isMoveValid = validMovesForPiece.some(move => move.row === to.row && move.col === to.col);

    if (isMoveValid) {
      const isPromotion = fromPiece.type === 'Pawn' && (
          (fromPiece.player === 'Red' && to.row === 0) ||
          (fromPiece.player === 'Blue' && to.row === 13) ||
          (fromPiece.player === 'Yellow' && to.col === 13) ||
          (fromPiece.player === 'Green' && to.col === 0)
      );

      if (isPromotion) {
          setPromotionMove({ from, to });
      } else {
          applyMove(from, to);
      }
    }
    setSelectedSquare(null);
  };

  const handleSquareClick = (row: number, col: number) => {
    const { row: originalRow, col: originalCol } = getOriginalCoords(row, col, currentUserPlayerId, BOARD_SIZE);
    
    if (winner || promotionMove) return;

    const clickedSquare = board[originalRow][originalCol];
    if (selectedSquare) {
      handleAttemptMove(selectedSquare, { row: originalRow, col: originalCol });
    } else if (clickedSquare.piece && clickedSquare.piece.player === currentPlayer.id) {
      setSelectedSquare({ row: originalRow, col: originalCol });
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotionSelect = (pieceType: PieceType) => {
    if (!promotionMove) return;
    applyMove(promotionMove.from, promotionMove.to, pieceType);
    setPromotionMove(null);
  };

  const onRestart = () => {
    setHistory([createNewGameState()]);
    setHistoryIndex(0);
    toast({ title: "Game Restarted", description: "A new game has begun." });
  }

  const onUndo = () => {
    if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
    }
  };

  const onRedo = () => {
    if (historyIndex < history.length - 1) {
        setHistoryIndex(historyIndex + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      <div className="md:col-span-2">
        <ChessBoard
          board={displayBoard}
          onSquareClick={handleSquareClick}
          selectedSquare={displaySelectedSquare}
          validMoves={validMoves}
          lastMove={displayLastMove}
        />
      </div>
      <div>
        <GameInfoPanel
          currentPlayer={currentPlayer}
          eliminatedPlayers={eliminatedPlayerIds.map(id => players.find(p => p.id === id)!)}
          winner={winner ? players.find(p => p.id === winner)! : null}
          onRestart={onRestart}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          capturedPieces={capturedPieces}
          players={players}
        />
      </div>
      {promotionMove && (
        <PromotionDialog
            player={currentPlayer}
            onSelectPiece={handlePromotionSelect}
        />
      )}
    </div>
  );
}
