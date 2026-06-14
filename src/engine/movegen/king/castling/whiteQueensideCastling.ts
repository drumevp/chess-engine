import { COLOR } from "../../../constants/color";
import {
  CASTLING_RIGHTS,
  WHITE_KING_ORIGIN_SQUARE,
  WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
  WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
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

const whiteQueenCastling = (ctx: MoveGenerationContext): void => {
  const isWhiteQueensideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.WHITE_QUEENSIDE) !== 0;

  if (!isWhiteQueensideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === WHITE_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const a1BitboardLo = squareBitboardsLo[WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE];
  const a1BitboardHi = squareBitboardsHi[WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE];
  const rooksIndex = calculatePieceIndex(COLOR.WHITE, ROOK_INDEX);
  const isRookOnA1 =
    (((a1BitboardLo & ctx.stateLo[rooksIndex]) |
      (a1BitboardHi & ctx.stateHi[rooksIndex])) >>>
      0) !==
    0;

  if (!isRookOnA1) {
    return;
  }

  const e1BitboardLo = squareBitboardsLo[WHITE_KING_ORIGIN_SQUARE];
  const e1BitboardHi = squareBitboardsHi[WHITE_KING_ORIGIN_SQUARE];
  const b1BitboardLo = squareBitboardsLo[1];
  const b1BitboardHi = squareBitboardsHi[1];
  const c1BitboardLo =
    squareBitboardsLo[WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
  const c1BitboardHi =
    squareBitboardsHi[WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
  const d1BitboardLo =
    squareBitboardsLo[WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
  const d1BitboardHi =
    squareBitboardsHi[WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];

  // The path the king travels is from e1 to c1
  // The squares in between the rook (a1) and the king (e1) are b1, c1, d1
  const emptyMaskLo = (b1BitboardLo | c1BitboardLo | d1BitboardLo) >>> 0;
  const emptyMaskHi = (b1BitboardHi | c1BitboardHi | d1BitboardHi) >>> 0;

  const isPathEmpty =
    (((ctx.allOccupancyLo & emptyMaskLo) |
      (ctx.allOccupancyHi & emptyMaskHi)) >>>
      0) ===
    0;

  if (!isPathEmpty) {
    return;
  }

  const attackScratch: Bitboard32 = { lo: 0, hi: 0 };
  const occupancyOnD1Lo =
    ((ctx.allOccupancyLo & ~e1BitboardLo) | d1BitboardLo) >>> 0;
  const occupancyOnD1Hi =
    ((ctx.allOccupancyHi & ~e1BitboardHi) | d1BitboardHi) >>> 0;
  const isD1Safe = !isSquareAttackedWithOccupancy(
    WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.BLACK,
    ctx.stateLo,
    ctx.stateHi,
    occupancyOnD1Lo,
    occupancyOnD1Hi,
    attackScratch,
  );

  if (!isD1Safe) {
    return;
  }

  const finalOccupancyLo =
    ((ctx.allOccupancyLo & ~e1BitboardLo & ~a1BitboardLo) |
      c1BitboardLo |
      d1BitboardLo) >>>
    0;
  const finalOccupancyHi =
    ((ctx.allOccupancyHi & ~e1BitboardHi & ~a1BitboardHi) |
      c1BitboardHi |
      d1BitboardHi) >>>
    0;
  const isC1Safe = !isSquareAttackedWithOccupancy(
    WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
    COLOR.BLACK,
    ctx.stateLo,
    ctx.stateHi,
    finalOccupancyLo,
    finalOccupancyHi,
    attackScratch,
  );

  if (!isC1Safe) {
    return;
  }

  addMove(
    ctx.moves,
    encodeMove(
      ctx.ownKingSquare,
      WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
      ctx.color,
      KING_INDEX,
      MOVE_FLAG.QUEEN_CASTLE,
    ),
  );
};

export default whiteQueenCastling;
