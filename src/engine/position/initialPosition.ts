import { CASTLING_RIGHTS } from "../constants/castling";
import { COLOR } from "../constants/color";
import { KING_INDEX, PAWN_INDEX, ROOK_INDEX } from "../constants/piece";
import { INITIAL_STATE_LO, INITIAL_STATE_HI } from "../constants/position";
import hashPosition from "../hash/zobrist";
import buildPieceAtArray from "../helpers/buildPieceAtArray";
import calculatePieceIndex from "../helpers/calculatePieceIndex";
import getOccupiedPiecesBitboard from "../helpers/getPiecesOccupied";
import { Position } from "../types/position";

export const createInitialPosition = (): Position => {
  const stateLo = new Uint32Array(INITIAL_STATE_LO);
  const stateHi = new Uint32Array(INITIAL_STATE_HI);

  const pieceAtInitial = buildPieceAtArray(stateLo, stateHi);
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

  const { occupancyLo: allOccupancyLo, occupancyHi: allOccupancyHi } =
    getOccupiedPiecesBitboard(stateLo, stateHi);

  const { occupancyLo: whiteOccupancyLo, occupancyHi: whiteOccupancyHi } =
    getOccupiedPiecesBitboard(
      stateLo.slice(ROOK_INDEX, PAWN_INDEX + 1),
      stateHi.slice(ROOK_INDEX, PAWN_INDEX + 1),
    );

  const { occupancyLo: blackOccupancyLo, occupancyHi: blackOccupancyHi } =
    getOccupiedPiecesBitboard(
      stateLo.slice(
        calculatePieceIndex(COLOR.BLACK, ROOK_INDEX),
        calculatePieceIndex(COLOR.BLACK, PAWN_INDEX) + 1,
      ),
      stateHi.slice(
        calculatePieceIndex(COLOR.BLACK, ROOK_INDEX),
        calculatePieceIndex(COLOR.BLACK, PAWN_INDEX) + 1,
      ),
    );

  const castlingRights =
    CASTLING_RIGHTS.WHITE_KINGSIDE |
    CASTLING_RIGHTS.WHITE_QUEENSIDE |
    CASTLING_RIGHTS.BLACK_KINGSIDE |
    CASTLING_RIGHTS.BLACK_QUEENSIDE;

  const position: Position = {
    stateLo,
    stateHi,
    allOccupancyLo,
    allOccupancyHi,
    whiteOccupancyLo,
    whiteOccupancyHi,
    blackOccupancyLo,
    blackOccupancyHi,
    color: COLOR.WHITE,
    castlingRights,
    enPassantSquare: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    pieceAt: pieceAtInitial,
    kingSquares: kingSquares,
    zobristHash: 0n,
  };

  position.zobristHash = hashPosition(position);

  return position;
};
