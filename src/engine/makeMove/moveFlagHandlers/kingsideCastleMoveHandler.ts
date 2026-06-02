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
import { COLOR, type Move, type Position } from "../../types/main";
import clearSquare from "../occupancy/clearSquare";
import setSquare from "../occupancy/setSquare";

const kingsideCastleMoveHandler = (position: Position, move: Move) => {
  const kingStateIndex = calculatePieceIndex(move.color, KING_INDEX);
  const rookStateIndex = calculatePieceIndex(move.color, ROOK_INDEX);

  let rookFrom: number;
  let rookTo: number;

  if (move.color === COLOR.WHITE) {
    rookFrom = WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE;
    rookTo = WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE;
  } else {
    rookFrom = BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE;
    rookTo = BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE;
  }

  // Update king position
  clearSquare(position, move.from);
  setSquare(position, move.to, kingStateIndex);
  position.kingSquares[move.color] = move.to;

  // Update rook position
  clearSquare(position, rookFrom);
  setSquare(position, rookTo, rookStateIndex);
};

export default kingsideCastleMoveHandler;
