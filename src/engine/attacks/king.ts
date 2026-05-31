import { kingAttacks as kingAttacksTable } from "../lookupTables/importedPrecalculatedData";

const kingAttacks = (square: number) => {
  return kingAttacksTable[square];
}

export default kingAttacks;