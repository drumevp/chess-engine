import { FULL_BOARD_MASK } from "../constants/mask";
import { rookRelevantBlockerMasks, rookMagicNumbers, rookMagicAttacks, rookShifts } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

// occupancy here is full board occupancy
const generateRookAttacks: GenerateAttacksFn = (square, occupancy) => {
  const blockers = occupancy & rookRelevantBlockerMasks[square];
  const magicIndex = ((blockers * rookMagicNumbers[square]) & FULL_BOARD_MASK) >> BigInt(rookShifts[square]);

  return rookMagicAttacks[square][Number(magicIndex)];
}

export default generateRookAttacks;