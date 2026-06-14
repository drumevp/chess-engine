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
  const hasIgnoredAttacker = (ignoredAttackerLo | ignoredAttackerHi) !== 0;

  const pawnsIndex = calculatePieceIndex(attackingColor, PAWN_INDEX);
  const knightsIndex = calculatePieceIndex(attackingColor, KNIGHT_INDEX);
  const bishopsIndex = calculatePieceIndex(attackingColor, BISHOP_INDEX);
  const rooksIndex = calculatePieceIndex(attackingColor, ROOK_INDEX);
  const queensIndex = calculatePieceIndex(attackingColor, QUEEN_INDEX);
  const kingIndex = calculatePieceIndex(attackingColor, KING_INDEX);

  const pawnAttackFn =
    attackingColor === COLOR.WHITE
      ? generateBlackPawnAttacks
      : generateWhitePawnAttacks;

  pawnAttackFn(square, occupancyLo, occupancyHi, out);

  const pawnsLo = hasIgnoredAttacker
    ? stateLo[pawnsIndex] & ~ignoredAttackerLo
    : stateLo[pawnsIndex];
  const pawnsHi = hasIgnoredAttacker
    ? stateHi[pawnsIndex] & ~ignoredAttackerHi
    : stateHi[pawnsIndex];

  if (((out.lo & pawnsLo) | (out.hi & pawnsHi)) >>> 0 !== 0) {
    return true;
  }

  generateKnightAttacks(square, occupancyLo, occupancyHi, out);

  const knightsLo = hasIgnoredAttacker
    ? stateLo[knightsIndex] & ~ignoredAttackerLo
    : stateLo[knightsIndex];
  const knightsHi = hasIgnoredAttacker
    ? stateHi[knightsIndex] & ~ignoredAttackerHi
    : stateHi[knightsIndex];

  if (((out.lo & knightsLo) | (out.hi & knightsHi)) !== 0) {
    return true;
  }

  generateKingAttacks(square, occupancyLo, occupancyHi, out);

  const kingLo = hasIgnoredAttacker
    ? stateLo[kingIndex] & ~ignoredAttackerLo
    : stateLo[kingIndex];
  const kingHi = hasIgnoredAttacker
    ? stateHi[kingIndex] & ~ignoredAttackerHi
    : stateHi[kingIndex];

  if (((out.lo & kingLo) | (out.hi & kingHi)) !== 0) {
    return true;
  }

  generateRookAttacks(square, occupancyLo, occupancyHi, out);

  const rooksOrQueensLo = hasIgnoredAttacker
    ? (stateLo[rooksIndex] | stateLo[queensIndex]) & ~ignoredAttackerLo
    : stateLo[rooksIndex] | stateLo[queensIndex];
  const rooksOrQueensHi = hasIgnoredAttacker
    ? (stateHi[rooksIndex] | stateHi[queensIndex]) & ~ignoredAttackerHi
    : stateHi[rooksIndex] | stateHi[queensIndex];

  if (((out.lo & rooksOrQueensLo) | (out.hi & rooksOrQueensHi)) !== 0) {
    return true;
  }

  generateBishopAttacks(square, occupancyLo, occupancyHi, out);

  const bishopsOrQueensLo = hasIgnoredAttacker
    ? (stateLo[bishopsIndex] | stateLo[queensIndex]) & ~ignoredAttackerLo
    : stateLo[bishopsIndex] | stateLo[queensIndex];
  const bishopsOrQueensHi = hasIgnoredAttacker
    ? (stateHi[bishopsIndex] | stateHi[queensIndex]) & ~ignoredAttackerHi
    : stateHi[bishopsIndex] | stateHi[queensIndex];

  return ((out.lo & bishopsOrQueensLo) | (out.hi & bishopsOrQueensHi)) !== 0;
};

export default isSquareAttackedWithOccupancy;
