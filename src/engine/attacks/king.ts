import { kingAttacksHi, kingAttacksLo } from "../tables/importTables";
import { GenerateAttacksFn } from "../types/attacks";

const generateKingAttacks: GenerateAttacksFn = (
  square,
  _occupancyLo,
  _occupancyHi,
  out,
) => {
  out.lo = kingAttacksLo[square];
  out.hi = kingAttacksHi[square];
};

export default generateKingAttacks;
