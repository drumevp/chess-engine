import { COLOR } from "../../../constants/color";
import {
  BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
  BLACK_KING_ORIGIN_SQUARE,
  BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
  CASTLING_RIGHTS,
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

const h8BitboardLo = squareBitboardsLo[BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE];
const h8BitboardHi = squareBitboardsHi[BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE];
const e8BitboardLo = squareBitboardsLo[BLACK_KING_ORIGIN_SQUARE];
const e8BitboardHi = squareBitboardsHi[BLACK_KING_ORIGIN_SQUARE];
const f8BitboardLo =
  squareBitboardsLo[BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];
const f8BitboardHi =
  squareBitboardsHi[BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];
const g8BitboardLo =
  squareBitboardsLo[BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];
const g8BitboardHi =
  squareBitboardsHi[BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];

const emptySafeMaskLo = (f8BitboardLo | g8BitboardLo) >>> 0;
const emptySafeMaskHi = (f8BitboardHi | g8BitboardHi) >>> 0;

const attackScratch: Bitboard32 = { lo: 0, hi: 0 };

const blackKingsideCastling = (ctx: MoveGenerationContext): void => {
  const isBlackKingsideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.BLACK_KINGSIDE) !== 0;

  if (!isBlackKingsideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const rooksIndex = calculatePieceIndex(COLOR.BLACK, ROOK_INDEX);
  const isRookOnH8 =
    ((h8BitboardLo & ctx.stateLo[rooksIndex]) |
      (h8BitboardHi & ctx.stateHi[rooksIndex])) >>>
      0 !==
    0;

  if (!isRookOnH8) {
    return;
  }

  const isPathEmpty =
    ((ctx.allOccupancyLo & emptySafeMaskLo) |
      (ctx.allOccupancyHi & emptySafeMaskHi)) >>>
      0 ===
    0;

  if (!isPathEmpty) {
    return;
  }

  const occupancyOnF8Lo =
    ((ctx.allOccupancyLo & ~e8BitboardLo) | f8BitboardLo) >>> 0;
  const occupancyOnF8Hi =
    ((ctx.allOccupancyHi & ~e8BitboardHi) | f8BitboardHi) >>> 0;
  const isF8Safe = !isSquareAttackedWithOccupancy(
    BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.WHITE,
    ctx.stateLo,
    ctx.stateHi,
    occupancyOnF8Lo,
    occupancyOnF8Hi,
    attackScratch,
  );

  if (!isF8Safe) {
    return;
  }

  const finalOccupancyLo =
    ((ctx.allOccupancyLo & ~e8BitboardLo & ~h8BitboardLo) |
      f8BitboardLo |
      g8BitboardLo) >>>
    0;
  const finalOccupancyHi =
    ((ctx.allOccupancyHi & ~e8BitboardHi & ~h8BitboardHi) |
      f8BitboardHi |
      g8BitboardHi) >>>
    0;
  const isG8Safe = !isSquareAttackedWithOccupancy(
    BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.WHITE,
    ctx.stateLo,
    ctx.stateHi,
    finalOccupancyLo,
    finalOccupancyHi,
    attackScratch,
  );

  if (!isG8Safe) {
    return;
  }

  addMove(
    ctx.moves,
    encodeMove(
      ctx.ownKingSquare,
      BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
      ctx.color,
      KING_INDEX,
      MOVE_FLAG.KING_CASTLE,
    ),
  );
};

export default blackKingsideCastling;
