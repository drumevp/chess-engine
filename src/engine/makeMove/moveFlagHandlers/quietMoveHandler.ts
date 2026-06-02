import { calculatePieceIndex, KING_INDEX } from "../../state/initialState";
import type { Move, Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const quietMoveHandler = (position: Position, move: Move) => {
  const pieceStateIndex = calculatePieceIndex(move.color, move.piece);

  clearSquare(position, move.from);
  setSquare(position, move.to, pieceStateIndex);

  if (move.piece === KING_INDEX) {
    position.kingSquares[move.color] = move.to;
  }
};

export default quietMoveHandler;
