import { calculatePieceIndex } from "../../state/initialState";
import type { ColorType, Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const promotionMoveHandler = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType, movePromotionPiece: number | null) => {
  if (movePromotionPiece === null) {
    throw new Error(`No promotion piece`);
  }

  const promotionPieceStateIndex = calculatePieceIndex(
    moveColor,
    movePromotionPiece,
  );

  clearSquare(position, moveFrom);
  setSquare(position, moveTo, promotionPieceStateIndex);
};

export default promotionMoveHandler;
