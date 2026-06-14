import isOwnKingSafeAfterEnPassant from "../../movegen/pawn/isOwnKingSafeAfterEnPassant";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";
import { Bitboard32 } from "../../types/bitboard";
import { ColorType } from "../../types/color";
import { Position } from "../../types/position";

const isLegalEnPassantForHash = (
  position: Position,
  pawnOriginSquare: number,
  enPassantSquare: number,
  capturedPawnSquare: number,
  enemyColor: ColorType,
): boolean => {
  const originSquareBitboardLo = squareBitboardsLo[pawnOriginSquare];
  const originSquareBitboardHi = squareBitboardsHi[pawnOriginSquare];
  const targetEnPassantPawnBitboardLo = squareBitboardsLo[capturedPawnSquare];
  const targetEnPassantPawnBitboardHi = squareBitboardsHi[capturedPawnSquare];
  const enPassantBitboardLo = squareBitboardsLo[enPassantSquare];
  const enPassantBitboardHi = squareBitboardsHi[enPassantSquare];

  const ownKingSquare = position.kingSquares[position.color];
  const scratch: Bitboard32 = { lo: 0, hi: 0 };

  return isOwnKingSafeAfterEnPassant(
    position.allOccupancyLo,
    position.allOccupancyHi,
    position.stateLo,
    position.stateHi,
    originSquareBitboardLo,
    originSquareBitboardHi,
    targetEnPassantPawnBitboardLo,
    targetEnPassantPawnBitboardHi,
    enPassantBitboardLo,
    enPassantBitboardHi,
    ownKingSquare,
    enemyColor,
    scratch,
  );
};

export default isLegalEnPassantForHash;
