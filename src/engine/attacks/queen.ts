import bishopAttacks from "./bishop";
import rookAttacks from "./rook";

const queenAttacks = (square: number, occupancy: bigint) => {
  return rookAttacks(square, occupancy) | bishopAttacks(square, occupancy);

}

export default queenAttacks;