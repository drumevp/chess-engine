import { squareBitboards } from "../../../tables/importTables";
import { encodeMove } from "../../../position/moves/packedMove";
import { addMove } from "../../moveList";
import { AttackInfo } from "../../../types/attackInfo";
import { BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE, BLACK_KING_ORIGIN_SQUARE, BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE, BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE, CASTLING_RIGHTS } from "../../../constants/castling";
import { KING_INDEX, ROOK_INDEX } from "../../../constants/piece";
import calculatePieceIndex from "../../../helpers/calculatePieceIndex";
import { MoveGenerationContext } from "../../../types/move";
import { COLOR } from "../../../constants/color";
import { MOVE_FLAG } from "../../../constants/move";

const blackKingsideCastling = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const isBlackKingsideCastlingAllowed =
    (ctx.castlingRights & CASTLING_RIGHTS.BLACK_KINGSIDE) !== 0;

  if (!isBlackKingsideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const h8Bitboard = squareBitboards[BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[calculatePieceIndex(COLOR.BLACK, ROOK_INDEX)];
  const isRookOnH8 = (h8Bitboard & rooksBitboard) !== 0n;

  if (!isRookOnH8) {
    return;
  }

  const g8Bitboard =
    squareBitboards[BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const f8Bitboard =
    squareBitboards[BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];

  const emptySafeMask = f8Bitboard | g8Bitboard;

  const isPathEmpty = (ctx.allOccupancy & emptySafeMask) === 0n;

  if (!isPathEmpty) {
    return;
  }

  const isPathSafe = (attackInfo.enemyAttackedSquares & emptySafeMask) === 0n;

  if (!isPathSafe) {
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
