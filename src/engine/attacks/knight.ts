import { knightAttacks as knightAttacksTable } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateKnightAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return knightAttacksTable[square];
}

export default generateKnightAttacks;