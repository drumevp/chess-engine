import { GenerateAttacksFn } from "../types/attacks";
import bishopAttacks from "./bishop";
import rookAttacks from "./rook";

const generateQueenAttacks: GenerateAttacksFn = (square, occupancy) => {
  return rookAttacks(square, occupancy) | bishopAttacks(square, occupancy);
}

export default generateQueenAttacks;