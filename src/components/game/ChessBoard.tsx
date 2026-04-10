'use client';

import { cn } from '@/lib/utils';
import type { Board, Move, Player, PlayerId } from '@/lib/game/types';
import { PIECE_EMOJIS, PLAYERS } from '@/lib/game/constants';
import { memo } from 'react';

interface ChessBoardProps {
  board: Board;
  onSquareClick: (row: number, col: number) => void;
  selectedSquare: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  lastMove: Move | null;
  players: Player[];
  eliminatedPlayerIds: PlayerId[];
}

const ChessBoard = ({
  board,
  onSquareClick,
  selectedSquare,
  validMoves,
  lastMove,
}: ChessBoardProps) => {
  return (
    <div className="aspect-square w-full bg-card p-2 rounded-lg shadow-lg">
      <div className="grid plus-shape-grid h-full w-full">
        {board.map((row, rowIndex) =>
          row.map((square, colIndex) => {
            const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
            const isValidMove = validMoves.some(move => move.row === rowIndex && move.col === colIndex);
            const isLastMove = (lastMove?.from.row === rowIndex && lastMove?.from.col === colIndex) ||
                                (lastMove?.to.row === rowIndex && lastMove?.to.col === colIndex);

            const isLightSquare = (rowIndex + colIndex) % 2 === 0;

            return (
              <Square
                key={`${rowIndex}-${colIndex}`}
                square={square}
                isLightSquare={isLightSquare}
                isSelected={isSelected}
                isValidMove={isValidMove}
                isLastMove={isLastMove}
                onClick={() => onSquareClick(rowIndex, colIndex)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

interface SquareProps {
    square: import('@/lib/game/types').Square;
    isLightSquare: boolean;
    isSelected: boolean;
    isValidMove: boolean;
    isLastMove: boolean;
    onClick: () => void;
}

const Square = memo(function Square({ square, isLightSquare, isSelected, isValidMove, isLastMove, onClick }: SquareProps) {
    if (!square.isActive) {
      return <div className="bg-background" />;
    }

    const player = square.piece ? PLAYERS.find(p => p.id === square.piece!.player) : null;

    return (
        <button
          onClick={onClick}
          className={cn(
            'relative flex items-center justify-center w-full h-full transition-colors duration-200',
            isLightSquare ? 'bg-secondary' : 'bg-muted',
            isSelected && 'bg-accent/50 ring-2 ring-accent',
            isLastMove && 'bg-primary/20',
            'hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          aria-label={`Square ${square.row}, ${square.col} with ${square.piece ? `${square.piece.player} ${square.piece.type}` : 'empty'}`}
        >
          {square.piece && player && (
            <span
              className="text-2xl md:text-3xl lg:text-4xl"
              style={{
                color: player.color,
                WebkitTextStroke: '1px black',
                paintOrder: 'stroke fill',
              }}
            >
              {PIECE_EMOJIS[square.piece.player][square.piece.type]}
            </span>
          )}
          {isValidMove && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                'rounded-full',
                square.piece ? 'w-full h-full border-4 border-accent/50' : 'w-1/3 h-1/3 bg-accent/50'
              )}></div>
            </div>
          )}
        </button>
    );
});


export default ChessBoard;
