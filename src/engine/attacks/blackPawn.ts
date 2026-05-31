import { blackPawnAttacks as blackPawnAttacksTable } from "../lookupTables/importedPrecalculatedData";

const blackPawnAttacks = (square: number) => {
  return blackPawnAttacksTable[square];
}

export default blackPawnAttacks;