import { whitePawnAttacks as whitePawnAttacksTable } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateWhitePawnAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return whitePawnAttacksTable[square];
}

export default generateWhitePawnAttacks;