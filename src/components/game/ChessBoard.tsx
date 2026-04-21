'use client';

import { cn } from '@/lib/utils';
import type { Board, Move, Piece, PlayerId } from '@/lib/game/types';
import { PIECE_EMOJIS, PLAYERS, BOARD_SIZE } from '@/lib/game/constants';
import { memo, useMemo, useState, useEffect, useRef } from 'react';

interface ChessBoardProps {
  board: Board;
  onSquareClick: (row: number, col: number) => void;
  selectedSquare: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  lastMove: Move | null;
  perspective: PlayerId;
  currentPlayerId: PlayerId;
  inCheckPlayerIds: PlayerId[];
}

interface SquareProps {
    isLightSquare: boolean;
    isSelected: boolean;
    isValidMove: boolean;
    isLastMove: boolean;
    isCheckKingSquare: boolean;
    onClick: () => void;
    hasPiece: boolean;
}

const Square = memo(function Square({ isLightSquare, isSelected, isValidMove, isLastMove, isCheckKingSquare, onClick, hasPiece }: SquareProps) {
    return (
        <button
          onClick={onClick}
          className={cn(
            'relative flex items-center justify-center w-full h-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring',
            isLightSquare ? 'bg-secondary' : 'bg-muted',
            isSelected && 'bg-accent/50 ring-2 ring-accent',
            isLastMove && 'bg-yellow-300/60',
            isCheckKingSquare && 'bg-red-500/40',
            'hover:bg-accent/30'
          )}
          aria-label={`Square`}
        >
          {isValidMove && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                'rounded-full',
                hasPiece ? 'w-full h-full border-4 border-accent/50' : 'w-1/3 h-1/3 bg-accent/50'
              )}></div>
            </div>
          )}
        </button>
    );
});

const PieceComponent = ({
    piece,
    row,
    col,
  }: {
    piece: Piece;
    row: number;
    col: number;
  }) => {
    const player = PLAYERS.find((p) => p.id === piece.player);
    if (!player) return null;
  
    const squareSizePercent = 100 / BOARD_SIZE;
  
    return (
      <div
        className="absolute flex items-center justify-center cursor-default"
        style={{
          width: `${squareSizePercent}%`,
          height: `${squareSizePercent}%`,
          top: `${row * squareSizePercent}%`,
          left: `${col * squareSizePercent}%`,
        }}
      >
        <span
          className="text-2xl md:text-3xl lg:text-4xl"
          style={{
            color: player.color,
            WebkitTextStroke: '1px black',
            paintOrder: 'stroke fill',
          }}
        >
          {PIECE_EMOJIS[piece.player][piece.type]}
        </span>
      </div>
    );
  };

const ChessBoard = ({
  board,
  onSquareClick,
  selectedSquare,
  validMoves,
  lastMove,
  perspective,
  currentPlayerId,
  inCheckPlayerIds,
}: ChessBoardProps) => {

  const [animationClass, setAnimationClass] = useState('');
  
  const isMyTurn = perspective === currentPlayerId;
  const amIInCheck = inCheckPlayerIds.includes(perspective);
  
  const prevIsMyTurnRef = useRef(isMyTurn);
  const prevAmIInCheckRef = useRef(amIInCheck);

  useEffect(() => {
    const wasMyTurn = prevIsMyTurnRef.current;
    const wasIInCheck = prevAmIInCheckRef.current;
    
    let timer: NodeJS.Timeout | undefined;

    // A check alert takes priority over a turn alert
    if (amIInCheck && !wasIInCheck) { // Just got into check
        setAnimationClass('animate-check-flash');
        timer = setTimeout(() => setAnimationClass(''), 400); // Remove class after animation
    } else if (isMyTurn && !wasMyTurn) { // Just became my turn
        setAnimationClass('animate-turn-flash');
        timer = setTimeout(() => setAnimationClass(''), 400); // Remove class after animation
    }

    prevIsMyTurnRef.current = isMyTurn;
    prevAmIInCheckRef.current = amIInCheck;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isMyTurn, amIInCheck]);


  const kingInCheckSquares = useMemo(() => {
    const squares: {row: number, col: number}[] = [];
    if (inCheckPlayerIds.length === 0) return squares;

    for (const playerId of inCheckPlayerIds) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const square = board[r][c];
                if (square?.piece && square.piece.type === 'King' && square.piece.player === playerId) {
                    squares.push({ row: square.row, col: square.col });
                    break; 
                }
            }
        }
    }
    return squares;
  }, [board, inCheckPlayerIds]);
  
  return (
    <div className={cn(
        "aspect-square w-full bg-card p-2 rounded-lg shadow-lg transition-all duration-300",
        animationClass
    )}>
      <div className="relative h-full w-full">
        {/* Board grid for interaction */}
        <div className="grid plus-shape-grid h-full w-full">
          {board.map((row, rowIndex) =>
            row.map((square, colIndex) => {
              if (!square.isActive) {
                return <div key={`${rowIndex}-${colIndex}`} className="bg-background" />;
              }

              const isSelected = selectedSquare?.row === square.row && selectedSquare?.col === square.col;
              const isValidMove = validMoves.some(move => move.row === square.row && move.col === square.col);
              const isLastMove = (lastMove?.from.row === square.row && lastMove?.from.col === square.col) ||
                                  (lastMove?.to.row === square.row && lastMove?.to.col === square.col);
              const isLightSquare = (rowIndex + colIndex) % 2 === 0;
              const isCheckKingSquare = kingInCheckSquares.some(
                kingSquare => kingSquare.row === square.row && kingSquare.col === square.col
              );

              return (
                <Square
                  key={`${rowIndex}-${colIndex}`}
                  isLightSquare={isLightSquare}
                  isSelected={isSelected}
                  isValidMove={isValidMove}
                  isLastMove={isLastMove}
                  isCheckKingSquare={isCheckKingSquare}
                  onClick={() => onSquareClick(rowIndex, colIndex)}
                  hasPiece={!!square.piece}
                />
              );
            })
          )}
        </div>
        
        {/* Pieces layer for display */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {board.flatMap((row, rowIndex) =>
            row.map((square, colIndex) => {
              if (square.piece) {
                return (
                  <PieceComponent
                    key={`${square.row}-${square.col}-${square.piece.player}-${square.piece.type}`}
                    piece={square.piece}
                    row={rowIndex}
                    col={colIndex}
                  />
                );
              }
              return null;
            })
          )}
        </div>
      </div>
    </div>
  );
};


export default ChessBoard;
