import { NUMBER_OF_PIECE_CATEGORIES } from "../constants/piece";
import { ColorType } from "../types/color";

export const calculatePieceIndex = (color: ColorType, index: number) => {
  return color * NUMBER_OF_PIECE_CATEGORIES + index;
};

export default calculatePieceIndex;