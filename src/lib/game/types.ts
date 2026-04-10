export type PieceType = 'King' | 'Queen' | 'Rook' | 'Bishop' | 'Knight' | 'Pawn';
export type PlayerId = 'Red' | 'Blue' | 'Yellow' | 'Green';

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
}

export interface Piece {
  type: PieceType;
  player: PlayerId;
  hasMoved?: boolean;
}

export interface Square {
  row: number;
  col: number;
  piece: Piece | null;
  isActive: boolean;
}

export type Board = Square[][];

export interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

export interface GameState {
  board: Board;
  currentPlayerIndex: number;
  players: Player[];
  eliminatedPlayerIds: PlayerId[];
  winner: PlayerId | null;
  lastMove: Move | null;
  enPassantTarget: { row: number; col: number } | null;
  capturedPieces: { [key in PlayerId]?: Piece[] };
}
