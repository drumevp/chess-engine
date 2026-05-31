import { FULL_BOARD_MASK } from "../constants/mask";
import { bishopRelevantBlockerMasks, bishopMagicNumbers, bishopMagicAttacks, bishopShifts } from "../lookupTables/importedPrecalculatedData";
import type { GenerateAttacksFn } from "./types";

const generateBishopAttacks: GenerateAttacksFn = (square, occupancy) => {
  const blockers = occupancy & bishopRelevantBlockerMasks[square];
  const magicIndex = ((blockers * bishopMagicNumbers[square]) & FULL_BOARD_MASK) >> BigInt(bishopShifts[square]);

  return bishopMagicAttacks[square][Number(magicIndex)];
}

export default generateBishopAttacks;