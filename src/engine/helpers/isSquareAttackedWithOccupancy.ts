import generateBishopAttacks from "../attacks/bishop";
import generateBlackPawnAttacks from "../attacks/blackPawn";
import generateKingAttacks from "../attacks/king";
import generateKnightAttacks from "../attacks/knight";
import generateRookAttacks from "../attacks/rook";
import generateWhitePawnAttacks from "../attacks/whitePawn";
import { COLOR } from "../constants/color";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../constants/piece";
import calculatePieceIndex from "./calculatePieceIndex";
import { Bitboard32 } from "../types/bitboard";
import { ColorType } from "../types/color";

const isSquareAttackedWithOccupancy = (
  square: number,
  attackingColor: ColorType,
  stateLo: Uint32Array,
  stateHi: Uint32Array,
  occupancyLo: number,
  occupancyHi: number,
  out: Bitboard32,
  ignoredAttackerLo = 0,
  ignoredAttackerHi = 0,
): boolean => {
  const attackerMaskLo = ~ignoredAttackerLo;
  const attackerMaskHi = ~ignoredAttackerHi;

  const pawnsIndex = calculatePieceIndex(attackingColor, PAWN_INDEX);
  const knightsIndex = calculatePieceIndex(attackingColor, KNIGHT_INDEX);
  const bishopsIndex = calculatePieceIndex(attackingColor, BISHOP_INDEX);
  const rooksIndex = calculatePieceIndex(attackingColor, ROOK_INDEX);
  const queensIndex = calculatePieceIndex(attackingColor, QUEEN_INDEX);
  const kingIndex = calculatePieceIndex(attackingColor, KING_INDEX);

  const pawnsLo = (stateLo[pawnsIndex] & attackerMaskLo) >>> 0;
  const pawnsHi = (stateHi[pawnsIndex] & attackerMaskHi) >>> 0;

  const pawnAttackFn =
    attackingColor === COLOR.WHITE
      ? generateBlackPawnAttacks
      : generateWhitePawnAttacks;

  pawnAttackFn(square, occupancyLo, occupancyHi, out);

  if (((out.lo & pawnsLo) | (out.hi & pawnsHi)) >>> 0 !== 0) {
    return true;
  }

  generateKnightAttacks(square, occupancyLo, occupancyHi, out);

  if (
    ((out.lo & stateLo[knightsIndex] & attackerMaskLo) |
      (out.hi & stateHi[knightsIndex] & attackerMaskHi)) >>>
      0 !==
    0
  ) {
    return true;
  }

  generateKingAttacks(square, occupancyLo, occupancyHi, out);

  if (
    ((out.lo & stateLo[kingIndex] & attackerMaskLo) |
      (out.hi & stateHi[kingIndex] & attackerMaskHi)) >>>
      0 !==
    0
  ) {
    return true;
  }

  generateRookAttacks(square, occupancyLo, occupancyHi, out);

  const rooksOrQueensLo =
    ((stateLo[rooksIndex] | stateLo[queensIndex]) & attackerMaskLo) >>> 0;
  const rooksOrQueensHi =
    ((stateHi[rooksIndex] | stateHi[queensIndex]) & attackerMaskHi) >>> 0;

  if (((out.lo & rooksOrQueensLo) | (out.hi & rooksOrQueensHi)) >>> 0 !== 0) {
    return true;
  }

  generateBishopAttacks(square, occupancyLo, occupancyHi, out);

  const bishopsOrQueensLo =
    ((stateLo[bishopsIndex] | stateLo[queensIndex]) & attackerMaskLo) >>> 0;
  const bishopsOrQueensHi =
    ((stateHi[bishopsIndex] | stateHi[queensIndex]) & attackerMaskHi) >>> 0;

  return (
    ((out.lo & bishopsOrQueensLo) | (out.hi & bishopsOrQueensHi)) >>> 0 !== 0
  );
};

export default isSquareAttackedWithOccupancy;
