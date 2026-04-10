import { BOARD_SIZE, INACTIVE_ZONE_SIZE, PIECE_SETUP_ORDER, ROTATED_PIECE_SETUP_ORDER } from './constants';
import type { Board, GameState, Piece, PlayerId, Square } from './types';

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

  const placePlayerPieces = (player: PlayerId) => {
    const isBlue = player === 'Blue';
    const isGreen = player === 'Green';
    const setupOrder = (isBlue || isGreen) ? ROTATED_PIECE_SETUP_ORDER : PIECE_SETUP_ORDER;

    for (let i = 0; i < 8; i++) {
      const pawn: Piece = { type: 'Pawn', player, hasMoved: false };
      const piece: Piece = { type: setupOrder[i], player, hasMoved: false };

      if (player === 'Red') { // Bottom
        board[12][i + 3].piece = pawn;
        board[13][i + 3].piece = piece;
      } else if (player === 'Blue') { // Top
        board[1][i + 3].piece = pawn;
        board[0][i + 3].piece = piece;
      } else if (player === 'Green') { // Right 
        board[i + 3][12].piece = pawn;
        board[i + 3][13].piece = piece;
      } else if (player === 'Yellow') { // Left
        board[i + 3][1].piece = pawn;
        board[i + 3][0].piece = piece;
      }
    }
  };

  placePlayerPieces('Red');
  placePlayerPieces('Blue');
  placePlayerPieces('Green');
  placePlayerPieces('Yellow');

  return board;
};


const isWithinBounds = (row: number, col: number) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const canMoveTo = (square: Square | undefined, currentPlayerId: PlayerId) => {
    if (!square || !square.isActive) return false;
    return square.piece === null || square.piece.player !== currentPlayerId;
}

export const getValidMoves = (row: number, col: number, gameState: GameState): { row: number, col: number }[] => {
  const { board, enPassantTarget } = gameState;
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

      // One step forward
      const oneStep = { row: row + forwardDir.r, col: col + forwardDir.c };
      const oneStepSquare = isWithinBounds(oneStep.row, oneStep.col) ? board[oneStep.row][oneStep.col] : undefined;
      if (oneStepSquare?.isActive && !oneStepSquare.piece) {
        moves.push(oneStep);
        
        // Two steps forward
        if (!piece.hasMoved) {
            const twoSteps = { row: row + 2 * forwardDir.r, col: col + 2 * forwardDir.c };
            const twoStepsSquare = isWithinBounds(twoSteps.row, twoSteps.col) ? board[twoSteps.row][twoSteps.col] : undefined;
            if (twoStepsSquare?.isActive && !twoStepsSquare.piece && oneStepSquare.isActive && !oneStepSquare.piece) {
                moves.push(twoSteps);
            }
        }
      }

      // Captures
      for (const capDir of captureDirs) {
        const captureSquare = isWithinBounds(row + capDir.r, col + capDir.c) ? board[row + capDir.r][col + capDir.c] : undefined;
        if (captureSquare?.isActive && captureSquare.piece && captureSquare.piece.player !== player) {
          moves.push({ row: row + capDir.r, col: col + capDir.c });
        }
      }
      
      // En Passant
      if (enPassantTarget) {
          const epMove = { row: enPassantTarget.row, col: enPassantTarget.col };
          const isCaptureDirection = captureDirs.some(dir => row + dir.r === epMove.row && col + dir.c === epMove.col);
          if (isCaptureDirection) {
              moves.push(epMove);
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
      // Castling
      if (!piece.hasMoved) {
        // Red (bottom)
        if (player === 'Red' && row === 13 && col === 7) {
            // Kingside
            if (board[13][10].piece?.type === 'Rook' && !board[13][10].piece.hasMoved && !board[13][8].piece && !board[13][9].piece) moves.push({ row: 13, col: 9 });
            // Queenside
            if (board[13][3].piece?.type === 'Rook' && !board[13][3].piece.hasMoved && !board[13][4].piece && !board[13][5].piece && !board[13][6].piece) moves.push({ row: 13, col: 5 });
        }
        // Blue (top)
        if (player === 'Blue' && row === 0 && col === 6) {
            // Kingside (to col 8)
            if (board[0][10].piece?.type === 'Rook' && !board[0][10].piece.hasMoved && !board[0][7].piece && !board[0][8].piece && !board[0][9].piece) moves.push({ row: 0, col: 8 });
            // Queenside (to col 4)
            if (board[0][3].piece?.type === 'Rook' && !board[0][3].piece.hasMoved && !board[0][4].piece && !board[0][5].piece) moves.push({ row: 0, col: 4 });
        }
        // Yellow (left)
        if (player === 'Yellow' && row === 6 && col === 0) {
            // "Kingside" (down to row 8)
            if (board[10][0].piece?.type === 'Rook' && !board[10][0].piece.hasMoved && !board[7][0].piece && !board[8][0].piece && !board[9][0].piece) moves.push({ row: 8, col: 0 });
            // "Queenside" (up to row 4)
            if (board[3][0].piece?.type === 'Rook' && !board[3][0].piece.hasMoved && !board[4][0].piece && !board[5][0].piece) moves.push({ row: 4, col: 0 });
        }
        // Green (right)
        if (player === 'Green' && row === 7 && col === 13) {
            // "Kingside" (up to row 5)
            if (board[3][13].piece?.type === 'Rook' && !board[3][13].piece.hasMoved && !board[4][13].piece && !board[5][13].piece && !board[6][13].piece) moves.push({ row: 5, col: 13 });
            // "Queenside" (down to row 9)
            if (board[10][13].piece?.type === 'Rook' && !board[10][13].piece.hasMoved && !board[8][13].piece && !board[9][13].piece) moves.push({ row: 9, col: 13 });
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
