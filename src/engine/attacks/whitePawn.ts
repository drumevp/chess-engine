import { whitePawnAttacks as whitePawnAttacksTable } from "../lookupTables/importedPrecalculatedData";

const whitePawnAttacks = (square: number) => {
  return whitePawnAttacksTable[square];
}

export default whitePawnAttacks;