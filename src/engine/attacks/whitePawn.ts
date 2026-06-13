import { whitePawnAttacksHi, whitePawnAttacksLo } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateWhitePawnAttacks: GenerateAttacksFn = (
  square,
  _occupancyLo,
  _occupancyHi,
  out,
) => {
  out.lo = whitePawnAttacksLo[square];
  out.hi = whitePawnAttacksHi[square];
};

export default generateWhitePawnAttacks;
