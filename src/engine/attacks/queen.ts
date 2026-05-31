import bishopAttacks from "./bishop";
import rookAttacks from "./rook";
import type { GenerateAttacksFn } from "./types";

const generateQueenAttacks: GenerateAttacksFn = (square, occupancy) => {
  return rookAttacks(square, occupancy) | bishopAttacks(square, occupancy);
}

export default generateQueenAttacks;