import { calculatePieceIndex } from "../../state/initialState";
import { COLOR, type Move, type Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const enPassantMoveHandler = (position: Position, move: Move) => {
  const pieceStateIndex = calculatePieceIndex(move.color, move.piece);

  const squareToClear = move.color === COLOR.WHITE ? move.to - 8 : move.to + 8;

  clearSquare(position, move.from);
  clearSquare(position, squareToClear);
  setSquare(position, move.to, pieceStateIndex);
};

export default enPassantMoveHandler;
