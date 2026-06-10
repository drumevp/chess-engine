import { CASTLING_RIGHTS } from "../constants/castling";
import { COLOR } from "../constants/color";
import { KING_INDEX, PAWN_INDEX, ROOK_INDEX } from "../constants/piece";
import { INITIAL_STATE } from "../constants/position";
import buildPieceAtArray from "../helpers/buildPieceAtArray";
import calculatePieceIndex from "../helpers/calculatePieceIndex";
import getOccupiedPiecesBitboard from "../helpers/getPiecesOccupied";
import { Position } from "../types/position";

export const createInitialPosition = (): Position => {
  const state = [...INITIAL_STATE];

  const pieceAtInitial = buildPieceAtArray(INITIAL_STATE);
  const whiteKingSquare = pieceAtInitial.findIndex(
    (value) => value === KING_INDEX,
  );
  const blackKingSquare = pieceAtInitial.findIndex(
    (value) => value === calculatePieceIndex(COLOR.BLACK, KING_INDEX),
  );

  if (whiteKingSquare === -1 || blackKingSquare === -1) {
    throw new Error("Invalid king position");
  }

  const kingSquares = new Int8Array([whiteKingSquare, blackKingSquare]);

  const allOccupancy = getOccupiedPiecesBitboard(state);
  const whiteOccupancy = getOccupiedPiecesBitboard(
    state.slice(ROOK_INDEX, PAWN_INDEX + 1),
  );
  const blackOccupancy = getOccupiedPiecesBitboard(
    state.slice(
      calculatePieceIndex(COLOR.BLACK, ROOK_INDEX),
      calculatePieceIndex(COLOR.BLACK, PAWN_INDEX) + 1,
    ),
  );

  const castlingRights =
    CASTLING_RIGHTS.WHITE_KINGSIDE |
    CASTLING_RIGHTS.WHITE_QUEENSIDE |
    CASTLING_RIGHTS.BLACK_KINGSIDE |
    CASTLING_RIGHTS.BLACK_QUEENSIDE;

  return {
    state,
    allOccupancy,
    whiteOccupancy,
    blackOccupancy,
    color: COLOR.WHITE,
    castlingRights,
    enPassantSquare: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    pieceAt: pieceAtInitial,
    kingSquares: kingSquares,
  };
};