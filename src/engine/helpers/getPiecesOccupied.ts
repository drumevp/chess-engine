import { Bitboard } from "../types/bitboard";

const getOccupiedPiecesBitboard = (bitboardArray: Bitboard[]) => {
  let occupancy: Bitboard = 0n;

  for (let i = 0; i < bitboardArray.length; i++) {
    occupancy = occupancy | bitboardArray[i];
  }

  return occupancy;
}

export default getOccupiedPiecesBitboard;