import { blackPawnAttacksHi, blackPawnAttacksLo } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateBlackPawnAttacks: GenerateAttacksFn = (
  square,
  _occupancyLo,
  _occupancyHi,
  out,
) => {
  out.lo = blackPawnAttacksLo[square];
  out.hi = blackPawnAttacksHi[square];
};

export default generateBlackPawnAttacks;
