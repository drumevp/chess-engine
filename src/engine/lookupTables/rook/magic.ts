/**
 * Hashing formula for magic index = occupancy * magic number >> shift
 */

import { getMagicNumberCandidate } from "../../helpers/main";
import { FULL_BOARD } from "../../state/initialState";
import { rookAttacks } from "./attack";
import { rookBlockerSubsets } from "./blockerSubsets";
import { rookShift } from "./shift";

export const rookMagic: bigint[] = new Array(64);
export const rookMagicIndexedAttackTable: bigint[][] = new Array(64);

for (let i = 0; i < 64; i++) {
  const shift = rookShift[i];
  const tableSize = 2**(64 - shift);

  const blockerSubsets = rookBlockerSubsets[i];
  const attacks = rookAttacks[i];

  while(true) {
    const candidateMagic = getMagicNumberCandidate();
    const table: bigint[] = new Array(tableSize);

    let candidateFailed = false;

    for (let j = 0; j < blockerSubsets.length; j++) {
      const blockerSubset = blockerSubsets[j];
      const attack = attacks[j];
      const product = blockerSubset * candidateMagic;

      // Truncate to 64bits
      const product64 = product & FULL_BOARD;
      const magicIndex = product64 >> BigInt(shift);

      const magicIndexNumber = Number(magicIndex);
      
      const existingAttack = table[magicIndexNumber];

      if (existingAttack === undefined) {
        table[magicIndexNumber] = attack;
      } else if (existingAttack === attack) {
        continue;
      } else {
        candidateFailed = true;
        break;
      }
    }

    if (!candidateFailed) {
      rookMagic[i] = candidateMagic;
      rookMagicIndexedAttackTable[i] = table;
  
      break;
    }
  }
}