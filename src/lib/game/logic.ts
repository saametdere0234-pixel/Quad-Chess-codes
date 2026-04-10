import { BOARD_SIZE, INACTIVE_ZONE_SIZE, PIECE_SETUP_ORDER, ROTATED_PIECE_SETUP_ORDER } from './constants';
import type { Board, Piece, PlayerId, Square } from './types';

export const isInactive = (row: number, col: number): boolean => {
  const isTop = row < INACTIVE_ZONE_SIZE;
  const isBottom = row >= BOARD_SIZE - INACTIVE_ZONE_SIZE;
  const isLeft = col < INACTIVE_ZONE_SIZE;
  const isRight = col >= BOARD_SIZE - INACTIVE_ZONE_SIZE;

  return (isTop && isLeft) || (isTop && isRight) || (isBottom && isLeft) || (isBottom && isRight);
};

export const createInitialBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE)
    .fill(null)
    .map((_, row) =>
      Array(BOARD_SIZE)
        .fill(null)
        .map((_, col) => ({
          row,
          col,
          piece: null,
          isActive: !isInactive(row, col),
        }))
    );

  const placePlayerPieces = (player: PlayerId, isRotated: boolean, isTopOrLeft: boolean) => {
    const setupOrder = isRotated ? ROTATED_PIECE_SETUP_ORDER : PIECE_SETUP_ORDER;

    for (let i = 0; i < 8; i++) {
      const pawn: Piece = { type: 'Pawn', player };
      const piece: Piece = { type: setupOrder[i], player };

      if (player === 'Red') { // Bottom
        board[12][i + 3].piece = pawn;
        board[13][i + 3].piece = piece;
      } else if (player === 'Blue') { // Top
        board[1][i + 3].piece = pawn;
        board[0][i + 3].piece = piece;
      } else if (player === 'Yellow') { // Left
        board[i + 3][1].piece = pawn;
        board[i + 3][0].piece = piece;
      } else if (player === 'Green') { // Right
        board[i + 3][12].piece = pawn;
        board[i + 3][13].piece = piece;
      }
    }
  };

  placePlayerPieces('Red', false, false);
  placePlayerPieces('Blue', true, true);
  placePlayerPieces('Yellow', true, true);
  placePlayerPieces('Green', false, false);

  return board;
};


const isWithinBounds = (row: number, col: number) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const canMoveTo = (square: Square | undefined, currentPlayerId: PlayerId) => {
    if (!square || !square.isActive) return false;
    return square.piece === null || square.piece.player !== currentPlayerId;
}

export const getValidMoves = (row: number, col: number, board: Board): { row: number, col: number }[] => {
  const piece = board[row][col].piece;
  if (!piece) return [];

  const moves: { row: number, col: number }[] = [];
  const { type, player } = piece;

  const addSlidingMoves = (directions: number[][]) => {
    for (const [dr, dc] of directions) {
      for (let i = 1; i < BOARD_SIZE; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;

        if (!isWithinBounds(newRow, newCol)) break;
        
        const targetSquare = board[newRow][newCol];
        if (!targetSquare.isActive) break;

        if (targetSquare.piece) {
          if (targetSquare.piece.player !== player) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
        moves.push({ row: newRow, col: newCol });
      }
    }
  };

  switch (type) {
    case 'Pawn':
      let forwardDir = { r: 0, c: 0 };
      let captureDirs: {r: number, c: number}[] = [];

      if (player === 'Red') { forwardDir = { r: -1, c: 0 }; captureDirs = [{ r: -1, c: -1 }, { r: -1, c: 1 }]; }
      if (player === 'Blue') { forwardDir = { r: 1, c: 0 }; captureDirs = [{ r: 1, c: -1 }, { r: 1, c: 1 }]; }
      if (player === 'Yellow') { forwardDir = { r: 0, c: 1 }; captureDirs = [{ r: -1, c: 1 }, { r: 1, c: 1 }]; }
      if (player === 'Green') { forwardDir = { r: 0, c: -1 }; captureDirs = [{ r: -1, c: -1 }, { r: 1, c: -1 }]; }

      const forwardSquare = board[row + forwardDir.r]?.[col + forwardDir.c];
      if (forwardSquare?.isActive && !forwardSquare.piece) {
        moves.push({ row: row + forwardDir.r, col: col + forwardDir.c });
      }

      for (const capDir of captureDirs) {
        const captureSquare = board[row + capDir.r]?.[col + capDir.c];
        if (captureSquare?.isActive && captureSquare.piece && captureSquare.piece.player !== player) {
          moves.push({ row: row + capDir.r, col: col + capDir.c });
        }
      }
      break;

    case 'Knight':
      const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isWithinBounds(newRow, newCol) && canMoveTo(board[newRow][newCol], player)) {
          moves.push({ row: newRow, col: newCol });
        }
      }
      break;

    case 'King':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const newRow = row + dr;
          const newCol = col + dc;
          if (isWithinBounds(newRow, newCol) && canMoveTo(board[newRow][newCol], player)) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;

    case 'Rook':
      addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;

    case 'Bishop':
      addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;

    case 'Queen':
      addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;
  }

  return moves;
};
