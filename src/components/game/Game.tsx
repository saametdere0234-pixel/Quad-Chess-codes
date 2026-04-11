'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { produce } from 'immer';
import ChessBoard from './ChessBoard';
import GameInfoPanel from './GameInfoPanel';
import PromotionDialog from './PromotionDialog';
import { createInitialBoard, getValidMoves } from '@/lib/game/logic';
import type { GameState, Move, Piece, PlayerId, Board, PieceType, Player } from '@/lib/game/types';
import { BOARD_SIZE, PLAYER_IDS } from '@/lib/game/constants';
import { useToast } from "@/hooks/use-toast";
import { getDatabase } from 'firebase/database';
import { ref, update } from 'firebase/database';
import { getLocalUser } from '@/lib/user';
import { Loader2 } from 'lucide-react';


function getRotatedBoard(board: Board, playerId: PlayerId): Board {
    const size = board.length;
    const newBoard = Array(size).fill(null).map(() => Array(size).fill(null));

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const { row: rotatedR, col: rotatedC } = getRotatedCoords(r, c, playerId, size);
            if (isFinite(rotatedR) && isFinite(rotatedC)) {
                newBoard[rotatedR][rotatedC] = { ...board[r][c], row: rotatedR, col: rotatedC };
            }
        }
    }
    return newBoard as Board;
}

function getOriginalCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
  switch (playerId) {
    case 'Red': return { row, col };
    case 'Green': return { row: col, col: size - 1 - row }; // 270 deg CW
    case 'Blue': return { row: size - 1 - row, col: size - 1 - col }; // 180 deg
    case 'Yellow': return { row: size - 1 - col, col: row }; // 90 deg CW
    default: return { row, col };
  }
}

function getRotatedCoords(row: number, col: number, playerId: PlayerId, size: number): { row: number; col: number } {
    if (row === -1 || col === -1) return {row, col};
    switch (playerId) {
        case 'Red': return { row, col }; // 0 deg
        case 'Green': return { row: size - 1 - col, col: row }; // 90 deg CCW
        case 'Blue': return { row: size - 1 - row, col: size - 1 - col }; // 180 deg
        case 'Yellow': return { row: col, col: size - 1 - row }; // 270 deg CCW
        default: return { row, col };
    }
}


interface GameProps {
  roomId: string;
  onLeaveRoom: () => void;
  userRole: 'player' | 'joining';
  roomData: any; 
}

export default function Game({ roomId, onLeaveRoom, userRole, roomData }: GameProps) {
  const { userId } = getLocalUser();
  const { toast } = useToast();

  const gameState = useMemo<GameState | null>(() => {
    if (roomData?.gameState) {
        try {
            return JSON.parse(roomData.gameState) as GameState;
        } catch (e) {
            console.error("Failed to parse game state:", e);
            return null;
        }
    }
    return null;
  }, [roomData]);

  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: { row: number; col: number }; to: { row: number; col: number } } | null>(null);
  
  const prevEliminatedPlayerIdsRef = useRef<PlayerId[]>([]);
    
  const userPlayerInfo = useMemo(() => 
    roomData?.players ? roomData.players[userId] : null
  , [roomData, userId]);
  
  const isEliminated = useMemo(() => {
    if (!gameState || !userPlayerInfo) return false;
    return gameState.eliminatedPlayerIds.includes(userPlayerInfo.playerId);
  }, [gameState, userPlayerInfo]);

  const isPlayerTurn = useMemo(() => {
    if (!gameState || !userPlayerInfo || gameState.players.length === 0) return false;
    return gameState.players[gameState.currentPlayerIndex]?.id === userPlayerInfo.playerId;
  }, [gameState, userPlayerInfo]);

  const canPlay = userRole === 'player' && !isEliminated;

  const perspective: PlayerId = useMemo(() => {
    return userPlayerInfo?.playerId || PLAYER_IDS[0];
  }, [userPlayerInfo]);
  
  useEffect(() => {
    if (isEliminated) {
      toast({
        variant: 'destructive',
        title: 'You have been eliminated!',
        description: 'You will be returned to the lobby.',
      });
      const timer = setTimeout(() => {
        onLeaveRoom();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isEliminated, onLeaveRoom, toast]);

  useEffect(() => {
    if (gameState && gameState.players.length > 0) {
      const prevEliminated = prevEliminatedPlayerIdsRef.current;
      const newlyEliminated = gameState.eliminatedPlayerIds.filter(id => !prevEliminated.includes(id));
      
      newlyEliminated.forEach(eliminatedId => {
        const playerName = gameState.players.find(p => p.id === eliminatedId)?.name;
        const isCurrentUserEliminated = userPlayerInfo?.playerId === eliminatedId;
        if(playerName && !isCurrentUserEliminated) {
            toast({
              title: "Player Eliminated!",
              description: `${playerName} has been eliminated.`,
              variant: "destructive",
            });
        }
      });

      if (gameState.winner && !prevEliminatedPlayerIdsRef.current.includes(gameState.winner)) {
        const winnerName = gameState.players.find(p => p.id === gameState.winner)?.name;
        if (winnerName) {
            toast({
                title: "Game Over!",
                description: `${winnerName} is victorious!`,
            });
        }
      }

      prevEliminatedPlayerIdsRef.current = [...gameState.eliminatedPlayerIds, ...(gameState.winner ? [gameState.winner] : [])];
    }
  }, [gameState, toast, userPlayerInfo]);

  useEffect(() => {
    setSelectedSquare(null);
  }, [gameState?.currentPlayerIndex, perspective]);

  const validMoves = useMemo(() => {
    if (!selectedSquare || !gameState) return [];
    const moves = getValidMoves(selectedSquare.row, selectedSquare.col, gameState);
    return moves.map(move => getRotatedCoords(move.row, move.col, perspective, BOARD_SIZE));
  }, [selectedSquare, gameState, perspective]);

  const displayBoard = useMemo(() => {
    if (!gameState) return createInitialBoard();
    return getRotatedBoard(gameState.board, perspective);
  }, [gameState, perspective]);
  
  const displaySelectedSquare = useMemo(() => {
    if (!selectedSquare) return null;
    return getRotatedCoords(selectedSquare.row, selectedSquare.col, perspective, BOARD_SIZE);
  }, [selectedSquare, perspective]);

  const displayLastMove = useMemo(() => {
      if (!gameState?.lastMove) return null;
      return {
          from: getRotatedCoords(gameState.lastMove.from.row, gameState.lastMove.from.col, perspective, BOARD_SIZE),
          to: getRotatedCoords(gameState.lastMove.to.row, gameState.lastMove.to.col, perspective, BOARD_SIZE),
      }
  }, [gameState?.lastMove, perspective]);

  const updateGameState = useCallback(async (nextState: GameState) => {
    const roomRef = ref(getDatabase(), 'rooms/' + roomId);
    await update(roomRef, { gameState: JSON.stringify(nextState) });
    setSelectedSquare(null);
  }, [roomId]);
  
  const applyMove = useCallback((from: { row: number, col: number }, to: { row: number, col: number }, promotionPieceType: PieceType | null = null) => {
    if (!gameState) return;
    const fromPiece = gameState.board[from.row][from.col].piece;
    if (!fromPiece) return;

    const nextState = produce(gameState, draft => {
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
  }, [gameState, updateGameState]);
  
  const handleAttemptMove = useCallback((from: { row: number, col: number }, to: { row: number, col: number }) => {
    if (!gameState) return;
    const fromPiece = gameState.board[from.row][from.col].piece;
    if (!fromPiece) {
      setSelectedSquare(null);
      return;
    }

    const validMovesForPiece = getValidMoves(from.row, from.col, gameState);
    const isMoveValid = validMovesForPiece.some(move => move.row === to.row && move.col === to.col);

    if (isMoveValid) {
      const isPromotion = fromPiece.type === 'Pawn' && (
        to.row <= 1 || to.row >= 12 || to.col <= 1 || to.col >= 12
      );
      
      const isFinalRank = (fromPiece.player === 'Red' && to.row <= 1) ||
                          (fromPiece.player === 'Blue' && to.row >= 12) ||
                          (fromPiece.player === 'Yellow' && to.col >= 12) ||
                          (fromPiece.player === 'Green' && to.col <= 1);
      
      if (isPromotion && isFinalRank) {
          setPromotionMove({ from, to });
      } else {
          applyMove(from, to);
      }
    }
    setSelectedSquare(null);
  }, [gameState, applyMove]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!gameState || gameState.winner || promotionMove || !canPlay) {
      return;
    }
    
    if(!isPlayerTurn) {
      toast({ title: "Not your turn!", description: "Please wait for your opponent to move.", variant: 'destructive'});
      return;
    }

    const { row: originalRow, col: originalCol } = getOriginalCoords(row, col, perspective, BOARD_SIZE);
    
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
  }, [gameState, promotionMove, toast, perspective, selectedSquare, handleAttemptMove, canPlay, isPlayerTurn]);

  const handlePromotionSelect = (pieceType: PieceType) => {
    if (!promotionMove) return;
    applyMove(promotionMove.from, promotionMove.to, pieceType);
    setPromotionMove(null);
  };
  
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading game...</div>;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const eliminatedPlayers = gameState.players.filter(p => gameState.eliminatedPlayerIds.includes(p.id));
  const winner = gameState.players.find(p => p.id === gameState.winner);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      <div className="md:col-span-2">
        <h1 className="text-3xl font-bold text-center mb-4 text-primary">
          {roomData.name}
        </h1>
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
          onLeaveRoom={onLeaveRoom}
          capturedPieces={gameState.capturedPieces}
          players={gameState.players}
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
