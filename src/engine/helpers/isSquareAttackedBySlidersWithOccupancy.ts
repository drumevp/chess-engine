import generateBishopAttacks from "../attacks/bishop";
import generateRookAttacks from "../attacks/rook";
import { BISHOP_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../constants/piece";
import { Bitboard32 } from "../types/bitboard";
import { ColorType } from "../types/color";
import calculatePieceIndex from "./calculatePieceIndex";

const isSquareAttackedBySlidersWithOccupancy = (
  square: number,
  attackingColor: ColorType,
  stateLo: Uint32Array,
  stateHi: Uint32Array,
  occupancyLo: number,
  occupancyHi: number,
  out: Bitboard32,
): boolean => {
  const rooksIndex = calculatePieceIndex(attackingColor, ROOK_INDEX);
  const bishopsIndex = calculatePieceIndex(attackingColor, BISHOP_INDEX);
  const queensIndex = calculatePieceIndex(attackingColor, QUEEN_INDEX);

  generateRookAttacks(square, occupancyLo, occupancyHi, out);

  if (
    ((out.lo & (stateLo[rooksIndex] | stateLo[queensIndex])) |
      (out.hi & (stateHi[rooksIndex] | stateHi[queensIndex]))) >>>
      0 !==
    0
  ) {
    return true;
  }

  generateBishopAttacks(square, occupancyLo, occupancyHi, out);

  return (
    ((out.lo & (stateLo[bishopsIndex] | stateLo[queensIndex])) |
      (out.hi & (stateHi[bishopsIndex] | stateHi[queensIndex]))) >>>
      0 !==
    0
  );
};

export default isSquareAttackedBySlidersWithOccupancy;
