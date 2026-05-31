import { NUMBER_OF_PIECE_CATEGORIES } from "../state/initialState";

const getPieceTypeFromStateIndex = (pieceIndex: number) => {
  return pieceIndex % NUMBER_OF_PIECE_CATEGORIES;
}

export default getPieceTypeFromStateIndex ;