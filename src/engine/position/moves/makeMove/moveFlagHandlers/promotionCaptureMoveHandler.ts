import calculatePieceIndex from "../../../../helpers/calculatePieceIndex";
import { ColorType } from "../../../../types/color";
import { Position } from "../../../../types/position";
import clearSquare from "../../occupancyHelpers/clearSquare";
import setSquare from "../../occupancyHelpers/setSquare";

const promotionCaptureMoveHandler = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType, movePromotionPiece: number | null) => {
  if (movePromotionPiece === null) {
    throw new Error(`No promotion piece`);
  }

  const promotionPieceStateIndex = calculatePieceIndex(
    moveColor,
    movePromotionPiece,
  );

  clearSquare(position, moveFrom);
  clearSquare(position, moveTo);
  setSquare(position, moveTo, promotionPieceStateIndex);
};

export default promotionCaptureMoveHandler;
