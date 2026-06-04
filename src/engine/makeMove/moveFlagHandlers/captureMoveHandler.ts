import { calculatePieceIndex, KING_INDEX } from "../../state/initialState";
import type { ColorType, Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const captureMoveHandler = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType, movePiece: number) => {
  const pieceStateIndex = calculatePieceIndex(moveColor, movePiece);

  clearSquare(position, moveFrom);
  clearSquare(position, moveTo);
  setSquare(position, moveTo, pieceStateIndex);

  if (movePiece === KING_INDEX) {
    position.kingSquares[moveColor] = moveTo;
  }
};

export default captureMoveHandler;
