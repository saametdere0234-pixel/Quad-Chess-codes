'use client';

import { useState, useMemo, useEffect } from 'react';
import ChessBoard from './ChessBoard';
import GameInfoPanel from './GameInfoPanel';
import { createInitialBoard, getValidMoves } from '@/lib/game/logic';
import type { GameState, Move, Square, FormattedLastMove, PlayerId } from '@/lib/game/types';
import { PLAYERS, PIECE_EMOJIS } from '@/lib/game/constants';
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
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [aiCommentary, setAiCommentary] = useState<string>('The game is about to begin. Good luck!');
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const { toast } = useToast();

  const { board, currentPlayerIndex, players, eliminatedPlayerIds, winner, lastMove } = gameState;
  const currentPlayer = useMemo(() => players[currentPlayerIndex], [players, currentPlayerIndex]);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getValidMoves(selectedSquare.row, selectedSquare.col, board);
  }, [selectedSquare, board]);

  useEffect(() => {
    if (winner) {
        toast({
            title: "Game Over!",
            description: `${players.find(p => p.id === winner)?.name} is victorious!`,
        })
    }
  }, [winner, players, toast]);

  const handleSquareClick = async (row: number, col: number) => {
    if (winner) return;

    const clickedSquare = board[row][col];
    if (selectedSquare) {
      const isValidMove = validMoves.some(move => move.row === row && move.col === col);

      if (isValidMove) {
        await makeMove(selectedSquare, { row, col });
      } else {
        setSelectedSquare(
          clickedSquare.piece && clickedSquare.piece.player === currentPlayer.id
            ? { row, col }
            : null
        );
      }
    } else if (clickedSquare.piece && clickedSquare.piece.player === currentPlayer.id) {
      setSelectedSquare({ row, col });
    }
  };

  const makeMove = async (from: { row: number, col: number }, to: { row: number, col: number }) => {
    const fromPiece = board[from.row][from.col].piece;
    if (!fromPiece) return;

    const capturedPiece = board[to.row][to.col].piece;
    const move: Move = { from, to };

    const formattedLastMove: FormattedLastMove = {
        piece: PIECE_EMOJIS[fromPiece.player][fromPiece.type],
        fromRow: from.row,
        fromCol: from.col,
        toRow: to.row,
        toCol: to.col,
        capturedPiece: capturedPiece ? PIECE_EMOJIS[capturedPiece.player][capturedPiece.type] : undefined,
    };

    const nextState = produce(gameState, draft => {
        draft.board[to.row][to.col].piece = fromPiece;
        draft.board[from.row][from.col].piece = null;
        draft.lastMove = move;
    });

    setGameState(nextState);
    setSelectedSquare(null);
    setAiCommentary('');
    setIsAIThinking(true);

    const postMoveState = produce(nextState, draft => {
        let newEliminated: PlayerId[] = [];
        if (capturedPiece?.type === 'King') {
            const eliminatedPlayerId = capturedPiece.player;
            if(!draft.eliminatedPlayerIds.includes(eliminatedPlayerId)) {
                newEliminated.push(eliminatedPlayerId);
                toast({
                    title: "Player Eliminated!",
                    description: `${players.find(p => p.id === eliminatedPlayerId)?.name} has been eliminated.`,
                    variant: "destructive",
                });
            }
        }

        if (newEliminated.length > 0) {
            draft.eliminatedPlayerIds.push(...newEliminated);
            // Remove all pieces of eliminated players
            for (let r = 0; r < 14; r++) {
                for (let c = 0; c < 14; c++) {
                    if (draft.board[r][c].piece && newEliminated.includes(draft.board[r][c].piece!.player)) {
                        draft.board[r][c].piece = null;
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

    setGameState(postMoveState);

    // AI Commentary
    const commentary = await fetchAICommentary({
        boardState: postMoveState.board.map(r => r.map(s => s.piece ? PIECE_EMOJIS[s.piece.player][s.piece.type] : '')),
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
          board={board}
          onSquareClick={handleSquareClick}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          lastMove={lastMove}
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
