import { blackPawnAttacks as blackPawnAttacksTable } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateBlackPawnAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return blackPawnAttacksTable[square];
}

export default generateBlackPawnAttacks;