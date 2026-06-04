import { calculatePieceIndex } from "../../state/initialState";
import { COLOR, type ColorType, type Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const enPassantMoveHandler = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType, movePiece: number) => {
  const pieceStateIndex = calculatePieceIndex(moveColor, movePiece);

  const squareToClear = moveColor === COLOR.WHITE ? moveTo - 8 : moveTo + 8;

  clearSquare(position, moveFrom);
  clearSquare(position, squareToClear);
  setSquare(position, moveTo, pieceStateIndex);
};

export default enPassantMoveHandler;
