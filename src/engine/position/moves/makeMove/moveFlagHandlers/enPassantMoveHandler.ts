import { COLOR } from "../../../../constants/color";
import calculatePieceIndex from "../../../../helpers/calculatePieceIndex";
import { ColorType } from "../../../../types/color";
import { Position } from "../../../../types/position";
import clearSquare from "../../occupancyHelpers/clearSquare";
import setSquare from "../../occupancyHelpers/setSquare";

const enPassantMoveHandler = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType, movePiece: number) => {
  const pieceStateIndex = calculatePieceIndex(moveColor, movePiece);

  const squareToClear = moveColor === COLOR.WHITE ? moveTo - 8 : moveTo + 8;

  clearSquare(position, moveFrom);
  clearSquare(position, squareToClear);
  setSquare(position, moveTo, pieceStateIndex);
};

export default enPassantMoveHandler;
