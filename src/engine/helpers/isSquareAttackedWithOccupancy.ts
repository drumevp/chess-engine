import calculateMagicIndex from "../bitboard32/calculateMagicIndex";
import { COLOR } from "../constants/color";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  NUMBER_OF_PIECE_CATEGORIES,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../constants/piece";
import {
  blackPawnAttacksHi,
  blackPawnAttacksLo,
  bishopMagicAttackOffsets,
  bishopMagicAttacksHi,
  bishopMagicAttacksLo,
  bishopMagicNumbersHi,
  bishopMagicNumbersLo,
  bishopRelevantBlockerMasksHi,
  bishopRelevantBlockerMasksLo,
  bishopShifts,
  kingAttacksHi,
  kingAttacksLo,
  knightAttacksHi,
  knightAttacksLo,
  rookMagicAttackOffsets,
  rookMagicAttacksHi,
  rookMagicAttacksLo,
  rookMagicNumbersHi,
  rookMagicNumbersLo,
  rookRelevantBlockerMasksHi,
  rookRelevantBlockerMasksLo,
  rookShifts,
  whitePawnAttacksHi,
  whitePawnAttacksLo,
} from "../tables/importTables";
import { Bitboard32 } from "../types/bitboard";
import { ColorType } from "../types/color";

const isSquareAttackedWithOccupancy = (
  square: number,
  attackingColor: ColorType,
  stateLo: Uint32Array,
  stateHi: Uint32Array,
  occupancyLo: number,
  occupancyHi: number,
  _out: Bitboard32,
  _ignoredAttackerLo = 0,
  _ignoredAttackerHi = 0,
): boolean => {
  const colorOffset = attackingColor * NUMBER_OF_PIECE_CATEGORIES;
  const pawnsIndex = colorOffset + PAWN_INDEX;
  const knightsIndex = colorOffset + KNIGHT_INDEX;
  const bishopsIndex = colorOffset + BISHOP_INDEX;
  const rooksIndex = colorOffset + ROOK_INDEX;
  const queensIndex = colorOffset + QUEEN_INDEX;
  const kingIndex = colorOffset + KING_INDEX;

  const pawnAttacksLo =
    attackingColor === COLOR.WHITE
      ? blackPawnAttacksLo[square]
      : whitePawnAttacksLo[square];
  const pawnAttacksHi =
    attackingColor === COLOR.WHITE
      ? blackPawnAttacksHi[square]
      : whitePawnAttacksHi[square];

  if (
    ((pawnAttacksLo & stateLo[pawnsIndex]) |
      (pawnAttacksHi & stateHi[pawnsIndex])) !==
    0
  ) {
    return true;
  }

  if (
    ((knightAttacksLo[square] & stateLo[knightsIndex]) |
      (knightAttacksHi[square] & stateHi[knightsIndex])) !==
    0
  ) {
    return true;
  }

  if (
    ((kingAttacksLo[square] & stateLo[kingIndex]) |
      (kingAttacksHi[square] & stateHi[kingIndex])) !==
    0
  ) {
    return true;
  }

  const rooksOrQueensLo = stateLo[rooksIndex] | stateLo[queensIndex];
  const rooksOrQueensHi = stateHi[rooksIndex] | stateHi[queensIndex];

  if ((rooksOrQueensLo | rooksOrQueensHi) !== 0) {
    const rookBlockersLo = occupancyLo & rookRelevantBlockerMasksLo[square];
    const rookBlockersHi = occupancyHi & rookRelevantBlockerMasksHi[square];
    const rookMagicIndex = calculateMagicIndex(
      rookBlockersLo,
      rookBlockersHi,
      rookMagicNumbersLo[square],
      rookMagicNumbersHi[square],
      rookShifts[square],
    );
    const rookTableIndex = rookMagicAttackOffsets[square] + rookMagicIndex;

    if (
      ((rookMagicAttacksLo[rookTableIndex] & rooksOrQueensLo) |
        (rookMagicAttacksHi[rookTableIndex] & rooksOrQueensHi)) !==
      0
    ) {
      return true;
    }
  }

  const bishopsOrQueensLo = stateLo[bishopsIndex] | stateLo[queensIndex];
  const bishopsOrQueensHi = stateHi[bishopsIndex] | stateHi[queensIndex];

  if ((bishopsOrQueensLo | bishopsOrQueensHi) === 0) {
    return false;
  }

  const bishopBlockersLo = occupancyLo & bishopRelevantBlockerMasksLo[square];
  const bishopBlockersHi = occupancyHi & bishopRelevantBlockerMasksHi[square];
  const bishopMagicIndex = calculateMagicIndex(
    bishopBlockersLo,
    bishopBlockersHi,
    bishopMagicNumbersLo[square],
    bishopMagicNumbersHi[square],
    bishopShifts[square],
  );
  const bishopTableIndex =
    bishopMagicAttackOffsets[square] + bishopMagicIndex;

  return (
    ((bishopMagicAttacksLo[bishopTableIndex] & bishopsOrQueensLo) |
      (bishopMagicAttacksHi[bishopTableIndex] & bishopsOrQueensHi)) !==
    0
  );
};

export default isSquareAttackedWithOccupancy;
