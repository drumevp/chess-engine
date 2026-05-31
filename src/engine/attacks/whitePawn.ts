import { whitePawnAttacks as whitePawnAttacksTable } from "../lookupTables/importedPrecalculatedData";
import type { GenerateAttacksFn } from "./types";

const generateWhitePawnAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return whitePawnAttacksTable[square];
}

export default generateWhitePawnAttacks;