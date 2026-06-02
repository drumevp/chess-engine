import { calculatePieceIndex } from "../../state/initialState";
import type { Move, Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const promotionMoveHandler = (position: Position, move: Move) => {
  if (move.promotionPiece === undefined) {
    throw new Error(`No promotion piece`);
  }

  const promotionPieceStateIndex = calculatePieceIndex(
    move.color,
    move.promotionPiece,
  );

  clearSquare(position, move.from);
  setSquare(position, move.to, promotionPieceStateIndex);
};

export default promotionMoveHandler;
