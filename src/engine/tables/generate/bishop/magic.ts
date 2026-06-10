import { FULL_BOARD_MASK } from "../../../constants/mask";
import { getMagicNumberCandidate } from "../../../helpers/main";
import { Bitboard } from "../../../types/bitboard";
import { bishopAttacks } from "./attack";
import { bishopBlockerSubsets } from "./blockerSubsets";
import { bishopShift } from "./shift";

export const bishopMagic: Bitboard[] = new Array(64);
export const bishopMagicIndexedAttackTable: Bitboard[][] = new Array(64);

for (let i = 0; i < 64; i++) {
  const shift = bishopShift[i];
  const tableSize = 2**(64 - shift);

  const blockerSubsets = bishopBlockerSubsets[i];
  const attacks = bishopAttacks[i];

  while(true) {
    const candidateMagic = getMagicNumberCandidate();
    const table: Bitboard[] = new Array(tableSize);

    let candidateFailed = false;

    for (let j = 0; j < blockerSubsets.length; j++) {
      const blockerSubset = blockerSubsets[j];
      const attack = attacks[j];
      const product = blockerSubset * candidateMagic;

      const product64 = product & FULL_BOARD_MASK;
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
      bishopMagic[i] = candidateMagic;
      bishopMagicIndexedAttackTable[i] = table;
  
      break;
    }
  }
}