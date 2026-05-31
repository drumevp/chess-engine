import { rookRelevantBlockerMasks, rookMagicNumbers, rookMagicAttacks, rookShifts } from "../lookupTables/importedPrecalculatedData";
import { FULL_BOARD } from "../state/initialState";

// occupancy here is full board occupancy
const rookAttacks = (square: number, occupancy: bigint): bigint => {
  const blockers = occupancy & rookRelevantBlockerMasks[square];
  const magicIndex = ((blockers * rookMagicNumbers[square]) & FULL_BOARD) >> BigInt(rookShifts[square]);

  return rookMagicAttacks[square][Number(magicIndex)];
}

export default rookAttacks;