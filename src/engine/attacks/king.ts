import { kingAttacks as kingAttacksTable } from "../lookupTables/importedPrecalculatedData";
import type { GenerateAttacksFn } from "./types";

const generateKingAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return kingAttacksTable[square];
}

export default generateKingAttacks;