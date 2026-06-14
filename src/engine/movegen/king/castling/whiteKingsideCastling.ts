import { COLOR } from "../../../constants/color";
import {
  CASTLING_RIGHTS,
  WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
  WHITE_KING_ORIGIN_SQUARE,
  WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
} from "../../../constants/castling";
import { MOVE_FLAG } from "../../../constants/move";
import { KING_INDEX, ROOK_INDEX } from "../../../constants/piece";
import calculatePieceIndex from "../../../helpers/calculatePieceIndex";
import isSquareAttackedWithOccupancy from "../../../helpers/isSquareAttackedWithOccupancy";
import { encodeMove } from "../../../position/moves/packedMove";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../../tables/importTables";
import { Bitboard32 } from "../../../types/bitboard";
import { MoveGenerationContext } from "../../../types/move";
import { addMove } from "../../moveList";

const whiteKingsideCastling = (ctx: MoveGenerationContext): void => {
  const isWhiteKingsideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.WHITE_KINGSIDE) !== 0;

  if (!isWhiteKingsideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === WHITE_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const h1BitboardLo = squareBitboardsLo[WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE];
  const h1BitboardHi = squareBitboardsHi[WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE];
  const rooksIndex = calculatePieceIndex(COLOR.WHITE, ROOK_INDEX);
  const isRookOnH1 =
    (((h1BitboardLo & ctx.stateLo[rooksIndex]) |
      (h1BitboardHi & ctx.stateHi[rooksIndex])) >>>
      0) !==
    0;

  if (!isRookOnH1) {
    return;
  }

  const e1BitboardLo = squareBitboardsLo[WHITE_KING_ORIGIN_SQUARE];
  const e1BitboardHi = squareBitboardsHi[WHITE_KING_ORIGIN_SQUARE];
  const f1BitboardLo =
    squareBitboardsLo[WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const f1BitboardHi =
    squareBitboardsHi[WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const g1BitboardLo =
    squareBitboardsLo[WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const g1BitboardHi =
    squareBitboardsHi[WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];

  // Between e1 and h1, the only squares are g1 and f1. So this mask handles both empty & safety
  const emptySafeMaskLo = (f1BitboardLo | g1BitboardLo) >>> 0;
  const emptySafeMaskHi = (f1BitboardHi | g1BitboardHi) >>> 0;

  const isPathEmpty =
    (((ctx.allOccupancyLo & emptySafeMaskLo) |
      (ctx.allOccupancyHi & emptySafeMaskHi)) >>>
      0) ===
    0;

  if (!isPathEmpty) {
    return;
  }

  const attackScratch: Bitboard32 = { lo: 0, hi: 0 };
  const occupancyOnF1Lo =
    ((ctx.allOccupancyLo & ~e1BitboardLo) | f1BitboardLo) >>> 0;
  const occupancyOnF1Hi =
    ((ctx.allOccupancyHi & ~e1BitboardHi) | f1BitboardHi) >>> 0;
  const isF1Safe = !isSquareAttackedWithOccupancy(
    WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.BLACK,
    ctx.stateLo,
    ctx.stateHi,
    occupancyOnF1Lo,
    occupancyOnF1Hi,
    attackScratch,
  );

  if (!isF1Safe) {
    return;
  }

  const finalOccupancyLo =
    ((ctx.allOccupancyLo & ~e1BitboardLo & ~h1BitboardLo) |
      f1BitboardLo |
      g1BitboardLo) >>>
    0;
  const finalOccupancyHi =
    ((ctx.allOccupancyHi & ~e1BitboardHi & ~h1BitboardHi) |
      f1BitboardHi |
      g1BitboardHi) >>>
    0;
  const isG1Safe = !isSquareAttackedWithOccupancy(
    WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.BLACK,
    ctx.stateLo,
    ctx.stateHi,
    finalOccupancyLo,
    finalOccupancyHi,
    attackScratch,
  );

  if (!isG1Safe) {
    return;
  }

  addMove(
    ctx.moves,
    encodeMove(
      ctx.ownKingSquare,
      WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
      ctx.color,
      KING_INDEX,
      MOVE_FLAG.KING_CASTLE,
    ),
  );
};

export default whiteKingsideCastling;
