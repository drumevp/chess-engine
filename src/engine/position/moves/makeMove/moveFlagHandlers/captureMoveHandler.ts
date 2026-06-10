import { KING_INDEX } from "../../../../constants/piece";
import calculatePieceIndex from "../../../../helpers/calculatePieceIndex";
import { ColorType } from "../../../../types/color";
import { Position } from "../../../../types/position";
import clearSquare from "../../occupancyHelpers/clearSquare";
import setSquare from "../../occupancyHelpers/setSquare";

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
