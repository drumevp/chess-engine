import { knightAttacks as knightAttacksTable } from "../lookupTables/importedPrecalculatedData";
import type { GenerateAttacksFn } from "./types";

const generateKnightAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return knightAttacksTable[square];
}

export default generateKnightAttacks;