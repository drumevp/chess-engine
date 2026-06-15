import { COLOR } from "../../../constants/color";
import {
  BLACK_KING_ORIGIN_SQUARE,
  BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
  BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
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

const a8BitboardLo = squareBitboardsLo[BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE];
const a8BitboardHi = squareBitboardsHi[BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE];
const e8BitboardLo = squareBitboardsLo[BLACK_KING_ORIGIN_SQUARE];
const e8BitboardHi = squareBitboardsHi[BLACK_KING_ORIGIN_SQUARE];
const b8BitboardLo = squareBitboardsLo[57];
const b8BitboardHi = squareBitboardsHi[57];
const c8BitboardLo =
  squareBitboardsLo[BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
const c8BitboardHi =
  squareBitboardsHi[BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
const d8BitboardLo =
  squareBitboardsLo[BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
const d8BitboardHi =
  squareBitboardsHi[BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];

const emptyMaskLo = (b8BitboardLo | c8BitboardLo | d8BitboardLo) >>> 0;
const emptyMaskHi = (b8BitboardHi | c8BitboardHi | d8BitboardHi) >>> 0;

const attackScratch: Bitboard32 = { lo: 0, hi: 0 };

const blackQueenCastling = (ctx: MoveGenerationContext): void => {
  const isBlackQueensideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.BLACK_QUEENSIDE) !== 0;

  if (!isBlackQueensideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const rooksIndex = calculatePieceIndex(COLOR.BLACK, ROOK_INDEX);
  const isRookOnA8 =
    ((a8BitboardLo & ctx.stateLo[rooksIndex]) |
      (a8BitboardHi & ctx.stateHi[rooksIndex])) >>>
      0 !==
    0;

  if (!isRookOnA8) {
    return;
  }

  const isPathEmpty =
    ((ctx.allOccupancyLo & emptyMaskLo) |
      (ctx.allOccupancyHi & emptyMaskHi)) >>>
      0 ===
    0;

  if (!isPathEmpty) {
    return;
  }

  const occupancyOnD8Lo =
    ((ctx.allOccupancyLo & ~e8BitboardLo) | d8BitboardLo) >>> 0;
  const occupancyOnD8Hi =
    ((ctx.allOccupancyHi & ~e8BitboardHi) | d8BitboardHi) >>> 0;
  const isD8Safe = !isSquareAttackedWithOccupancy(
    BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.WHITE,
    ctx.stateLo,
    ctx.stateHi,
    occupancyOnD8Lo,
    occupancyOnD8Hi,
    attackScratch,
  );

  if (!isD8Safe) {
    return;
  }

  const finalOccupancyLo =
    ((ctx.allOccupancyLo & ~e8BitboardLo & ~a8BitboardLo) |
      c8BitboardLo |
      d8BitboardLo) >>>
    0;
  const finalOccupancyHi =
    ((ctx.allOccupancyHi & ~e8BitboardHi & ~a8BitboardHi) |
      c8BitboardHi |
      d8BitboardHi) >>>
    0;
  const isC8Safe = !isSquareAttackedWithOccupancy(
    BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.WHITE,
    ctx.stateLo,
    ctx.stateHi,
    finalOccupancyLo,
    finalOccupancyHi,
    attackScratch,
  );

  if (!isC8Safe) {
    return;
  }

  addMove(
    ctx.moves,
    encodeMove(
      ctx.ownKingSquare,
      BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
      ctx.color,
      KING_INDEX,
      MOVE_FLAG.QUEEN_CASTLE,
    ),
  );
};

export default blackQueenCastling;
