import { NUMBER_OF_PIECE_CATEGORIES } from "../constants/piece";
import forEachBitGetSquare from "./forEachBitGetSquare";

const buildPieceAtArray = (
  stateLo: Uint32Array,
  stateHi: Uint32Array,
): Int8Array => {
  const piecesPositionArray = new Int8Array(64).fill(-1);

  for (
    let pieceIndex = 0;
    pieceIndex < NUMBER_OF_PIECE_CATEGORIES * 2;
    pieceIndex++
  ) {
    forEachBitGetSquare(stateLo[pieceIndex], stateHi[pieceIndex], (square) => {
      piecesPositionArray[square] = pieceIndex;
    });
  }

  return piecesPositionArray;
};

export default buildPieceAtArray;
