'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { produce } from 'immer';
import ChessBoard from './ChessBoard';
import GameInfoPanel from './GameInfoPanel';
import PromotionDialog from './PromotionDialog';
import { createInitialBoard, getValidMoves } from '@/lib/game/logic';
import type { GameState, Move, Piece, PlayerId, Board, PieceType, Player } from '@/lib/game/types';
import { BOARD_SIZE, PLAYERS } from '@/lib/game/constants';
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getLocalUser } from '@/lib/user';
import { useRouter } from 'next/navigation';

const createNewGameState = (): GameState => ({
  board: createInitialBoard(),
  currentPlayerIndex: 0,
  players: PLAYERS,
  eliminatedPlayerIds: [],
  winner: null,
  lastMove: null,
  enPassantTarget: null,
  capturedPieces: {},
  status: 'in-progress',
});

function getRotatedBoard(board: Board, playerId: PlayerId): Board {
  const size = board.length;
  const newBoard: Board = JSON.parse(JSON.stringify(board)); 

  const rotate90 = (b: Board): Board => {
    const rotated = b[0].map((_, colIndex) => b.map(row => row[colIndex]).reverse());
    return rotated.map((row, rowIndex) => row.map((sq, colIndex) => ({...sq, row: rowIndex, col: colIndex})));
  };
  const rotate180 = (b: Board) => rotate90(rotate90(b));
  const rotate270 = (b: Board) => rotate90(rotate180(b));

  switch (playerId) {
    case 'Red': return newBoard; 
    case 'Green': return rotate90(newBoard);
    case 'Blue': return rotate180(newBoard);
    case 'Yellow': return rotate270(newBoard);
    default: return newBoard;
  }
}

function getOriginalCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
  switch (playerId) {
    case 'Red': return { row, col };
    case 'Green': return { row: size - 1 - col, col: row };
    case 'Blue': return { row: size - 1 - row, col: size - 1 - col };
    case 'Yellow': return { row: col, col: size - 1 - row };
    default: return { row, col };
  }
}

function getRotatedCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
    if (row === -1 || col === -1) return {row, col};
    switch (playerId) {
        case 'Red': return { row, col };
        case 'Green': return { row: col, col: size - 1 - row };
        case 'Blue': return { row: size - 1 - row, col: size - 1 - col };
        case 'Yellow': return { row: size - 1 - col, col: row };
        default: return { row, col };
    }
}

interface GameProps {
  isMultiplayer?: boolean;
  roomId?: string;
}

export default function Game({ isMultiplayer = false, roomId }: GameProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { userId } = getLocalUser();

  const roomRef = useMemo(() => 
    isMultiplayer && firestore && roomId ? doc(firestore, 'rooms', roomId) : null
  , [isMultiplayer, firestore, roomId]);
  
  const { data: roomData, loading: roomLoading } = useDoc(roomRef);

  const [localHistory, setLocalHistory] = useState<GameState[]>([createNewGameState()]);
  const [localHistoryIndex, setHistoryIndex] = useState(0);

  const gameState = useMemo<GameState | null>(() => {
    if (isMultiplayer) {
      return roomData?.gameState ? JSON.parse(roomData.gameState) as GameState : null;
    }
    return localHistory[localHistoryIndex];
  }, [isMultiplayer, roomData, localHistory, localHistoryIndex]);

  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: { row: number; col: number }; to: { row: number; col: number } } | null>(null);
  const { toast } = useToast();
  
  const prevEliminatedPlayerIdsRef = useRef<PlayerId[]>([]);
  
  const players = useMemo<Player[]>(() => {
    if (isMultiplayer && roomData?.players) {
        return PLAYERS.map(basePlayer => {
            const roomPlayer = roomData.players.find((p: any) => p.playerId === basePlayer.id);
            return roomPlayer ? { ...basePlayer, name: roomPlayer.nickname } : basePlayer;
        });
    }
    return PLAYERS;
  }, [isMultiplayer, roomData?.players]);
  
  const userPlayerInfo = useMemo(() => 
    isMultiplayer && roomData ? roomData.players.find((p: any) => p.userId === userId) : null
  , [isMultiplayer, roomData, userId]);
  
  const currentUserPlayerId: PlayerId = useMemo(() => {
    if (isMultiplayer) {
      return userPlayerInfo?.playerId || 'Red';
    }
    return gameState?.players[gameState.currentPlayerIndex]?.id || 'Red';
  }, [isMultiplayer, userPlayerInfo, gameState]);

  useEffect(() => {
    if (gameState) {
      const prevEliminated = prevEliminatedPlayerIdsRef.current;
      const newlyEliminated = gameState.eliminatedPlayerIds.filter(id => !prevEliminated.includes(id));
      
      newlyEliminated.forEach(eliminatedId => {
        const playerName = players.find(p => p.id === eliminatedId)?.name;
        if(playerName) {
            toast({
              title: "Player Eliminated!",
              description: `${playerName} has been eliminated.`,
              variant: "destructive",
            });
        }
      });

      if (gameState.winner && !prevEliminatedPlayerIdsRef.current.includes(gameState.winner)) {
        const winnerName = players.find(p => p.id === gameState.winner)?.name;
        if (winnerName) {
            toast({
                title: "Game Over!",
                description: `${winnerName} is victorious!`,
            });
        }
      }

      prevEliminatedPlayerIdsRef.current = [...gameState.eliminatedPlayerIds, ...(gameState.winner ? [gameState.winner] : [])];
    }
  }, [gameState, players, toast]);

  useEffect(() => {
    setSelectedSquare(null);
  }, [gameState?.currentPlayerIndex, localHistoryIndex]);

  const validMoves = useMemo(() => {
    if (!selectedSquare || !gameState) return [];
    const moves = getValidMoves(selectedSquare.row, selectedSquare.col, { ...gameState, players });
    return moves.map(move => getRotatedCoords(move.row, move.col, currentUserPlayerId, BOARD_SIZE));
  }, [selectedSquare, gameState, currentUserPlayerId, players]);

  const displayBoard = useMemo(() => {
    if (!gameState) return createInitialBoard();
    return getRotatedBoard(gameState.board, currentUserPlayerId)
  }, [gameState, currentUserPlayerId]);
  
  const displaySelectedSquare = useMemo(() => {
    if (!selectedSquare) return null;
    return getRotatedCoords(selectedSquare.row, selectedSquare.col, currentUserPlayerId, BOARD_SIZE);
  }, [selectedSquare, currentUserPlayerId]);

  const displayLastMove = useMemo(() => {
      if (!gameState?.lastMove) return null;
      return {
          from: getRotatedCoords(gameState.lastMove.from.row, gameState.lastMove.from.col, currentUserPlayerId, BOARD_SIZE),
          to: getRotatedCoords(gameState.lastMove.to.row, gameState.lastMove.to.col, currentUserPlayerId, BOARD_SIZE),
      }
  }, [gameState?.lastMove, currentUserPlayerId]);

  const updateGameState = useCallback(async (nextState: GameState) => {
    if (isMultiplayer && roomRef) {
      await updateDoc(roomRef, { gameState: JSON.stringify(nextState) });
    } else {
      const newHistory = localHistory.slice(0, localHistoryIndex + 1);
      setLocalHistory([...newHistory, nextState]);
      setHistoryIndex(newHistory.length);
    }
    setSelectedSquare(null);
  }, [isMultiplayer, roomRef, localHistory, localHistoryIndex]);
  
  const applyMove = useCallback((from: { row: number, col: number }, to: { row: number, col: number }, promotionPieceType: PieceType | null = null) => {
    if (!gameState) return;
    const fromPiece = gameState.board[from.row][from.col].piece;
    if (!fromPiece) return;

    const nextState = produce({ ...gameState, players }, draft => {
        let capturedPiece: Piece | null = draft.board[to.row][to.col].piece;
        const move: Move = { from, to };
        const isEnPassant = fromPiece.type === 'Pawn' && !!draft.enPassantTarget && to.row === draft.enPassantTarget.row && to.col === draft.enPassantTarget.col;
        let enPassantCapturePos: { row: number, col: number } | null = null;
        
        if (isEnPassant) {
            if (fromPiece.player === 'Red') enPassantCapturePos = { row: to.row + 1, col: to.col };
            else if (fromPiece.player === 'Blue') enPassantCapturePos = { row: to.row - 1, col: to.col };
            else if (fromPiece.player === 'Green') enPassantCapturePos = { row: to.row, col: to.col + 1 };
            else if (fromPiece.player === 'Yellow') enPassantCapturePos = { row: to.row, col: to.col - 1 };
            
            if (enPassantCapturePos) {
                capturedPiece = draft.board[enPassantCapturePos.row][enPassantCapturePos.col].piece;
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

        if (isEnPassant && enPassantCapturePos) {
            draft.board[enPassantCapturePos.row][enPassantCapturePos.col].piece = null;
        }

        if (fromPiece.type === 'King' && (Math.abs(from.col - to.col) === 2 || Math.abs(from.row - to.row) === 2)) {
          if (Math.abs(from.col - to.col) === 2) { 
              const rookFromCol = to.col > from.col ? 10 : 3;
              const rookToCol = to.col > from.col ? to.col - 1 : to.col + 1;
              const rook = draft.board[from.row][rookFromCol]?.piece;
              if (rook) {
                  draft.board[from.row][rookToCol].piece = { ...rook, hasMoved: true };
                  draft.board[from.row][rookFromCol].piece = null;
              }
          }
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
            draft.status = 'finished';
        } else {
            let nextPlayerIndex = draft.currentPlayerIndex;
            do {
                nextPlayerIndex = (nextPlayerIndex + 1) % draft.players.length;
            } while (draft.eliminatedPlayerIds.includes(draft.players[nextPlayerIndex].id));
            draft.currentPlayerIndex = nextPlayerIndex;
        }
    });

    updateGameState(nextState);
  }, [gameState, players, updateGameState]);
  
  const handleAttemptMove = useCallback((from: { row: number, col: number }, to: { row: number, col: number }) => {
    if (!gameState) return;
    const fromPiece = gameState.board[from.row][from.col].piece;
    if (!fromPiece) {
      setSelectedSquare(null);
      return;
    }

    const validMovesForPiece = getValidMoves(from.row, from.col, { ...gameState, players });
    const isMoveValid = validMovesForPiece.some(move => move.row === to.row && move.col === to.col);

    if (isMoveValid) {
      const promotionRanks: {[key in PlayerId]: {rows: number[], cols: number[]}} = {
        Red: { rows: [0], cols: [0, 13] }, Blue: { rows: [13], cols: [0, 13] },
        Yellow: { rows: [0, 13], cols: [13] }, Green: { rows: [0, 13], cols: [0] },
      };
      
      const isPromotion = fromPiece.type === 'Pawn' && (
        promotionRanks[fromPiece.player].rows.some(r => r === to.row) ||
        promotionRanks[fromPiece.player].cols.some(c => c === to.col)
      );

      if (isPromotion) {
          setPromotionMove({ from, to });
      } else {
          applyMove(from, to);
      }
    }
    setSelectedSquare(null);
  }, [gameState, players, applyMove]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!gameState || gameState.winner || promotionMove) return;

    if(isMultiplayer && gameState.players[gameState.currentPlayerIndex].id !== userPlayerInfo.playerId) {
      toast({ title: "Not your turn!", description: "Please wait for your opponent to move.", variant: 'destructive'});
      return;
    }

    const { row: originalRow, col: originalCol } = getOriginalCoords(row, col, currentUserPlayerId, BOARD_SIZE);
    
    const clickedSquare = gameState.board[originalRow][originalCol];
    if (selectedSquare) {
      const fromPiece = gameState.board[selectedSquare.row][selectedSquare.col].piece;
      if (!fromPiece || fromPiece.player !== gameState.players[gameState.currentPlayerIndex].id) {
          setSelectedSquare(null);
          return;
      }
      handleAttemptMove(selectedSquare, { row: originalRow, col: originalCol });
    } else if (clickedSquare.piece && clickedSquare.piece.player === gameState.players[gameState.currentPlayerIndex].id) {
      setSelectedSquare({ row: originalRow, col: originalCol });
    } else {
      setSelectedSquare(null);
    }
  }, [gameState, promotionMove, isMultiplayer, userPlayerInfo, toast, currentUserPlayerId, selectedSquare, handleAttemptMove]);

  const handlePromotionSelect = (pieceType: PieceType) => {
    if (!promotionMove) return;
    applyMove(promotionMove.from, promotionMove.to, pieceType);
    setPromotionMove(null);
  };

  const onRestart = () => {
    if (isMultiplayer) {
      router.push('/lobby');
    } else {
      setLocalHistory([createNewGameState()]);
      setHistoryIndex(0);
      toast({ title: "Game Restarted", description: "A new game has begun." });
    }
  }

  const onUndo = () => {
    if (!isMultiplayer && localHistoryIndex > 0) {
        setHistoryIndex(localHistoryIndex - 1);
    }
  };

  const onRedo = () => {
    if (!isMultiplayer && localHistoryIndex < localHistory.length - 1) {
        setHistoryIndex(localHistoryIndex + 1);
    }
  };
  
  if ((isMultiplayer && roomLoading) || !gameState) {
    return <div className="flex items-center justify-center h-full">Loading game...</div>;
  }

  const currentPlayer = players.find(p => p.id === gameState.players[gameState.currentPlayerIndex].id);
  const eliminatedPlayers = players.filter(p => gameState.eliminatedPlayerIds.includes(p.id));
  const winner = players.find(p => p.id === gameState.winner);

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
          currentPlayer={currentPlayer!}
          eliminatedPlayers={eliminatedPlayers}
          winner={winner || null}
          onRestart={onRestart}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={!isMultiplayer && localHistoryIndex > 0}
          canRedo={!isMultiplayer && localHistoryIndex < localHistory.length - 1}
          capturedPieces={gameState.capturedPieces}
          players={players}
          isMultiplayer={isMultiplayer}
          roomName={isMultiplayer ? roomData?.name : undefined}
        />
      </div>
      {promotionMove && currentPlayer && (
        <PromotionDialog
            player={currentPlayer}
            onSelectPiece={handlePromotionSelect}
        />
      )}
    </div>
  );
}
