import forEachBitGetSquare from "../helpers/forEachBitGetSquare";

const buildPieceAtArray = (state: bigint[]): Int8Array => {
  const piecesPositionArray = new Int8Array(64).fill(-1);

  state.forEach((pieceBitboard, pieceIndex) => {
    forEachBitGetSquare(pieceBitboard, (square) => {
      piecesPositionArray[square] = pieceIndex;
    });
  });

  return piecesPositionArray;
}

export default buildPieceAtArray;