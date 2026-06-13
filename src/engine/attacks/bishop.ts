import calculateMagicIndex from "../bitboard32/calculateMagicIndex";
import {
  bishopMagicAttackOffsets,
  bishopMagicAttacksHi,
  bishopMagicAttacksLo,
  bishopMagicNumbersHi,
  bishopMagicNumbersLo,
  bishopRelevantBlockerMasksHi,
  bishopRelevantBlockerMasksLo,
  bishopShifts,
} from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateBishopAttacks: GenerateAttacksFn = (
  square,
  occupancyLo,
  occupancyHi,
  out,
) => {
  const blockersLo = occupancyLo & bishopRelevantBlockerMasksLo[square];
  const blockersHi = occupancyHi & bishopRelevantBlockerMasksHi[square];

  const magicIndex = calculateMagicIndex(
    blockersLo,
    blockersHi,
    bishopMagicNumbersLo[square],
    bishopMagicNumbersHi[square],
    bishopShifts[square],
  );

  const tableIndex = bishopMagicAttackOffsets[square] + magicIndex;

  out.lo = bishopMagicAttacksLo[tableIndex];
  out.hi = bishopMagicAttacksHi[tableIndex];
};

export default generateBishopAttacks;
