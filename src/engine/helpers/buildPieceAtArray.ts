import { Bitboard } from "../types/bitboard";
import forEachBitGetSquare from "./forEachBitGetSquare";

const buildPieceAtArray = (state: Bitboard[]): Int8Array => {
  const piecesPositionArray = new Int8Array(64).fill(-1);

  state.forEach((pieceBitboard, pieceIndex) => {
    forEachBitGetSquare(pieceBitboard, (square) => {
      piecesPositionArray[square] = pieceIndex;
    });
  });

  return piecesPositionArray;
}

export default buildPieceAtArray;