import { squareBitboards } from "../../../lookupTables/importedPrecalculatedData";
import { encodeMove } from "../../../packedMove/main";
import {
  calculatePieceIndex,
  CASTLING_RIGHTS,
  KING_INDEX,
  ROOK_INDEX,
} from "../../../state/initialState";
import { COLOR, MOVE_FLAG } from "../../../types/main";
import type { AttackInfo } from "../../attackInfo/types";
import { addMove } from "../../moveList";
import type { MoveGenerationContext } from "../../types";
import {
  WHITE_KING_ORIGIN_SQUARE,
  WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
  WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
} from "./generateCastlingMoves";

const whiteQueenCastling = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const isWhiteQueensideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.WHITE_QUEENSIDE) !== 0;

  if (!isWhiteQueensideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === WHITE_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const a1Bitboard = squareBitboards[WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[calculatePieceIndex(COLOR.WHITE, ROOK_INDEX)];
  const isRookOnA1 = (a1Bitboard & rooksBitboard) !== 0n;

  if (!isRookOnA1) {
    return;
  }

  const c1Bitboard =
    squareBitboards[WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
  const d1Bitboard =
    squareBitboards[WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];

  // The path the king travels is from e1 to c1
  const safeMask = c1Bitboard | d1Bitboard;
  // The squares in between the rook (a1) and the king (e1) are b1, c1, d1
  // b1 square is 1
  const emptyMask = squareBitboards[1] | c1Bitboard | d1Bitboard;

  const isPathEmpty = (ctx.allOccupancy & emptyMask) === 0n;

  if (!isPathEmpty) {
    return;
  }

  const isPathSafe = (attackInfo.enemyAttackedSquares & safeMask) === 0n;

  if (!isPathSafe) {
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
