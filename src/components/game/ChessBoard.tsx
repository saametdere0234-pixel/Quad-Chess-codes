'use client';

import { cn } from '@/lib/utils';
import type { Board, Move, Piece } from '@/lib/game/types';
import { PIECE_EMOJIS, PLAYERS, BOARD_SIZE } from '@/lib/game/constants';
import { memo } from 'react';

interface ChessBoardProps {
  board: Board;
  onSquareClick: (row: number, col: number) => void;
  selectedSquare: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  lastMove: Move | null;
}

interface SquareProps {
    isLightSquare: boolean;
    isSelected: boolean;
    isValidMove: boolean;
    isLastMove: boolean;
    onClick: () => void;
    hasPiece: boolean;
}

const Square = memo(function Square({ isLightSquare, isSelected, isValidMove, isLastMove, onClick, hasPiece }: SquareProps) {
    return (
        <button
          onClick={onClick}
          className={cn(
            'relative flex items-center justify-center w-full h-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring',
            isLightSquare ? 'bg-secondary' : 'bg-muted',
            isSelected && 'bg-accent/50 ring-2 ring-accent',
            isLastMove && 'bg-primary/20',
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
}: ChessBoardProps) => {
  
  return (
    <div className="aspect-square w-full bg-card p-2 rounded-lg shadow-lg">
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

              return (
                <Square
                  key={`${rowIndex}-${colIndex}`}
                  isLightSquare={isLightSquare}
                  isSelected={isSelected}
                  isValidMove={isValidMove}
                  isLastMove={isLastMove}
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