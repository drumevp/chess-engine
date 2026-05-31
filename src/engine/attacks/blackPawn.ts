import { blackPawnAttacks as blackPawnAttacksTable } from "../lookupTables/importedPrecalculatedData";
import type { GenerateAttacksFn } from "./types";

const generateBlackPawnAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return blackPawnAttacksTable[square];
}

export default generateBlackPawnAttacks;