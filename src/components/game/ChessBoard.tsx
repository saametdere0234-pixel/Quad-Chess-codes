'use client';

import { cn } from '@/lib/utils';
import type { Board, Move, Player, PlayerId, Piece } from '@/lib/game/types';
import { PIECE_EMOJIS, PLAYERS, BOARD_SIZE } from '@/lib/game/constants';
import { memo } from 'react';

interface ChessBoardProps {
  board: Board;
  onSquareClick: (row: number, col: number) => void;
  onPieceDrop: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
  selectedSquare: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  lastMove: Move | null;
  players: Player[];
  eliminatedPlayerIds: PlayerId[];
  currentPlayerId: PlayerId;
}

interface SquareProps {
    isLightSquare: boolean;
    isSelected: boolean;
    isValidMove: boolean;
    isLastMove: boolean;
    onClick: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    hasPiece: boolean;
}

const Square = memo(function Square({ isLightSquare, isSelected, isValidMove, isLastMove, onClick, onDrop, onDragOver, hasPiece }: SquareProps) {
    return (
        <button
          onClick={onClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
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
    isDraggable,
    onDragStart,
  }: {
    piece: Piece;
    row: number;
    col: number;
    isDraggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
  }) => {
    const player = PLAYERS.find((p) => p.id === piece.player);
    if (!player) return null;
  
    const squareSizePercent = 100 / BOARD_SIZE;
  
    return (
      <div
        draggable={isDraggable}
        onDragStart={isDraggable ? onDragStart : undefined}
        className={cn(
          "absolute flex items-center justify-center transition-all duration-300 ease-in-out",
          isDraggable ? "cursor-grab" : "cursor-default",
          isDraggable && "active:cursor-grabbing"
        )}
        style={{
          width: `${squareSizePercent}%`,
          height: `${squareSizePercent}%`,
          top: `${row * squareSizePercent}%`,
          left: `${col * squareSizePercent}%`,
          pointerEvents: 'auto',
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
  onPieceDrop,
  selectedSquare,
  validMoves,
  lastMove,
  currentPlayerId,
}: ChessBoardProps) => {

  const handleDragStart = (e: React.DragEvent, from: { row: number; col: number }) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ from }));
  };

  const handleDrop = (e: React.DragEvent, to: { row: number; col: number }) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      const { from } = JSON.parse(data);
      onPieceDrop(from, to);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
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
                  onDrop={(e) => handleDrop(e, { row: rowIndex, col: colIndex })}
                  onDragOver={handleDragOver}
                  hasPiece={!!square.piece}
                />
              );
            })
          )}
        </div>
        
        {/* Pieces layer for display and animation */}
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
                    isDraggable={square.piece.player === currentPlayerId}
                    onDragStart={(e) => handleDragStart(e, { row: square.row, col: square.col })}
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