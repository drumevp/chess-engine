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
  BLACK_KING_ORIGIN_SQUARE,
  BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
  BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
} from "./generateCastlingMoves";

const blackQueenCastling = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const isBlackQueensideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.BLACK_QUEENSIDE) !== 0;

  if (!isBlackQueensideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const a8Bitboard = squareBitboards[BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[calculatePieceIndex(COLOR.BLACK, ROOK_INDEX)];
  const isRookOnA8 = (a8Bitboard & rooksBitboard) !== 0n;

  if (!isRookOnA8) {
    return;
  }

  const c8Bitboard =
    squareBitboards[BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
  const d8Bitboard =
    squareBitboards[BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];

  const safeMask = c8Bitboard | d8Bitboard;
  const emptyMask = squareBitboards[57] | c8Bitboard | d8Bitboard;

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
      BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
      ctx.color,
      KING_INDEX,
      MOVE_FLAG.QUEEN_CASTLE,
    ),
  );
};

export default blackQueenCastling;
