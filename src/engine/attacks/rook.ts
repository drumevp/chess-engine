import calculateMagicIndex from "../bitboard32/calculateMagicIndex";
import {
  rookMagicAttackOffsets,
  rookMagicAttacksHi,
  rookMagicAttacksLo,
  rookMagicNumbersHi,
  rookMagicNumbersLo,
  rookRelevantBlockerMasksHi,
  rookRelevantBlockerMasksLo,
  rookShifts,
} from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

// occupancy here is full board occupancy
const generateRookAttacks: GenerateAttacksFn = (
  square,
  occupancyLo,
  occupancyHi,
  out,
) => {
  const blockersLo = occupancyLo & rookRelevantBlockerMasksLo[square];
  const blockersHi = occupancyHi & rookRelevantBlockerMasksHi[square];

  const magicIndex = calculateMagicIndex(
    blockersLo,
    blockersHi,
    rookMagicNumbersLo[square],
    rookMagicNumbersHi[square],
    rookShifts[square],
  );

  const tableIndex = rookMagicAttackOffsets[square] + magicIndex;

  out.lo = rookMagicAttacksLo[tableIndex];
  out.hi = rookMagicAttacksHi[tableIndex];
};

export default generateRookAttacks;
