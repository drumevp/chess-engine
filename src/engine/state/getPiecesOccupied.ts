const getOccupiedPiecesBitmap = (bitmapArray: bigint[]) => {
  let occupancy: bigint = 0n;

  for (let i = 0; i < bitmapArray.length; i++) {
    occupancy = occupancy | bitmapArray[i];
  }

  return occupancy;
}

export default getOccupiedPiecesBitmap;