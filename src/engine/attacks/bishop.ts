import { bishopRelevantBlockerMasks, bishopMagicNumbers, bishopMagicAttacks, bishopShifts } from "../lookupTables/importedPrecalculatedData";
import { FULL_BOARD } from "../state/initialState";

const bishopAttacks = (square: number, occupancy: bigint): bigint => {
  const blockers = occupancy & bishopRelevantBlockerMasks[square];
  const magicIndex = ((blockers * bishopMagicNumbers[square]) & FULL_BOARD) >> BigInt(bishopShifts[square]);

  return bishopMagicAttacks[square][Number(magicIndex)];
}

export default bishopAttacks;