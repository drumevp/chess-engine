import { knightAttacks as knightAttacksTable } from "../lookupTables/importedPrecalculatedData";

const knightAttacks = (square: number) => {
  return knightAttacksTable[square];
}

export default knightAttacks;