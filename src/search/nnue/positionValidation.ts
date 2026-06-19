import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";
import getPieceTypeFromStateIndex from "../../engine/helpers/getPieceTypeFromStateIndex";
import type { Position } from "../../engine/types/position";
import { getPieceColorFromStateIndex } from "./features";

const MAX_PIECES_PER_COLOR = 16;
const MAX_PAWNS_PER_COLOR = 8;

export const isPlausibleNnuePosition = (position: Position): boolean => {
  const counts = [new Uint8Array(6), new Uint8Array(6)];
  const totals = new Uint8Array(2);

  for (let square = 0; square < position.pieceAt.length; square++) {
    const stateIndex = position.pieceAt[square];

    if (stateIndex === -1) {
      continue;
    }

    const color = getPieceColorFromStateIndex(stateIndex);
    const piece = getPieceTypeFromStateIndex(stateIndex);

    counts[color][piece]++;
    totals[color]++;

    if (piece === PAWN_INDEX && (square < 8 || square >= 56)) {
      return false;
    }
  }

  for (let color = 0; color < counts.length; color++) {
    const pieces = counts[color];
    const pawns = pieces[PAWN_INDEX];

    if (
      totals[color] > MAX_PIECES_PER_COLOR ||
      pawns > MAX_PAWNS_PER_COLOR ||
      pieces[KING_INDEX] !== 1
    ) {
      return false;
    }

    const promotedPieces =
      Math.max(0, pieces[QUEEN_INDEX] - 1) +
      Math.max(0, pieces[ROOK_INDEX] - 2) +
      Math.max(0, pieces[BISHOP_INDEX] - 2) +
      Math.max(0, pieces[KNIGHT_INDEX] - 2);

    if (promotedPieces > MAX_PAWNS_PER_COLOR - pawns) {
      return false;
    }
  }

  const whiteKing = position.kingSquares[0];
  const blackKing = position.kingSquares[1];
  const fileDistance = Math.abs((whiteKing & 7) - (blackKing & 7));
  const rankDistance = Math.abs(
    Math.trunc(whiteKing / 8) - Math.trunc(blackKing / 8),
  );

  return fileDistance > 1 || rankDistance > 1;
};
