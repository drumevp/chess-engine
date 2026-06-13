import { knightAttacksHi, knightAttacksLo } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateKnightAttacks: GenerateAttacksFn = (
  square,
  _occupancyLo,
  _occupancyHi,
  out,
) => {
  out.lo = knightAttacksLo[square];
  out.hi = knightAttacksHi[square];
};

export default generateKnightAttacks;
