import type { Player, PlayerId, PieceType } from './types';

export const BOARD_SIZE = 14;
export const INACTIVE_ZONE_SIZE = 3;

export const PLAYERS: Player[] = [
  { id: 'Red', name: 'Player 1 (Red)', color: '#ef4444' },
  { id: 'Blue', name: 'Player 2 (Blue)', color: '#3b82f6' },
  { id: 'Yellow', name: 'Player 3 (Yellow)', color: '#eab308' },
  { id: 'Green', name: 'Player 4 (Green)', color: '#22c55e' },
];

export const PLAYER_IDS: PlayerId[] = ['Red', 'Blue', 'Yellow', 'Green'];

export const PIECE_EMOJIS: Record<PlayerId, Record<PieceType, string>> = {
  Red: { King: '♔', Queen: '♕', Rook: '♖', Bishop: '♗', Knight: '♘', Pawn: '♙' },
  Blue: { King: '♚', Queen: '♛', Rook: '♜', Bishop: '♝', Knight: '♞', Pawn: '♟' },
  Yellow: { King: '♔', Queen: '♕', Rook: '♖', Bishop: '♗', Knight: '♘', Pawn: '♙' },
  Green: { King: '♚', Queen: '♛', Rook: '♜', Bishop: '♝', Knight: '♞', Pawn: '♟' },
};

export const PIECE_SETUP_ORDER: PieceType[] = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];
export const ROTATED_PIECE_SETUP_ORDER: PieceType[] = ['Rook', 'Knight', 'Bishop', 'King', 'Queen', 'Bishop', 'Knight', 'Rook'];

