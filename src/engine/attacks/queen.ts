import { GenerateAttacksFn } from "../types/attacks";
import bishopAttacks from "./bishop";
import rookAttacks from "./rook";

const generateQueenAttacks: GenerateAttacksFn = (
  square,
  occupancyLo,
  occupancyHi,
  out,
) => {
  rookAttacks(square, occupancyLo, occupancyHi, out);

  // Store rook attacks
  const rookLo = out.lo;
  const rookHi = out.hi;

  // Update 'out' to bishop attacks
  bishopAttacks(square, occupancyLo, occupancyHi, out);

  out.lo = (out.lo | rookLo) >>> 0;
  out.hi = (out.hi | rookHi) >>> 0;
};

export default generateQueenAttacks;
