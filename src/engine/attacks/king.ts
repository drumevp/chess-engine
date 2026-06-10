import { kingAttacks as kingAttacksTable } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateKingAttacks: GenerateAttacksFn = (square, _occupancy) => {
  return kingAttacksTable[square];
}

export default generateKingAttacks;