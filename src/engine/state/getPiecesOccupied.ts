const getOccupiedPiecesBitboard = (bitboardArray: bigint[]) => {
  let occupancy: bigint = 0n;

  for (let i = 0; i < bitboardArray.length; i++) {
    occupancy = occupancy | bitboardArray[i];
  }

  return occupancy;
}

export default getOccupiedPiecesBitboard;