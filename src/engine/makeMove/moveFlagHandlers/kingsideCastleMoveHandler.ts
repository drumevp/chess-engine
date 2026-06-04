import {
  BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
  WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
} from "../../moves/king/castling/generateCastlingMoves";
import {
  calculatePieceIndex,
  KING_INDEX,
  ROOK_INDEX,
} from "../../state/initialState";
import { COLOR, type ColorType, type Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const kingsideCastleMoveHandler = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType) => {
  const kingStateIndex = calculatePieceIndex(moveColor, KING_INDEX);
  const rookStateIndex = calculatePieceIndex(moveColor, ROOK_INDEX);

  let rookFrom: number;
  let rookTo: number;

  if (moveColor === COLOR.WHITE) {
    rookFrom = WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE;
    rookTo = WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE;
  } else {
    rookFrom = BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE;
    rookTo = BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE;
  }

  // Update king position
  clearSquare(position, moveFrom);
  setSquare(position, moveTo, kingStateIndex);
  position.kingSquares[moveColor] = moveTo;

  // Update rook position
  clearSquare(position, rookFrom);
  setSquare(position, rookTo, rookStateIndex);
};

export default kingsideCastleMoveHandler;
