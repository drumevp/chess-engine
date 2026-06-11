import getOppositeColor from "../../helpers/getOppositeColor";
import { squareBitboards } from "../../tables/importTables";
import { encodeMove } from "../../position/moves/packedMove";
import { addMove } from "../moveList";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import { PAWN_INDEX } from "../../constants/piece";
import { Bitboard } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";
import { COLOR } from "../../constants/color";
import { MOVE_FLAG } from "../../constants/move";
import isOwnKingSafeAfterEnPassant from "./isOwnKingSafeAfterEnPassant";

const generateEnPassantMove = (
  ctx: MoveGenerationContext,
  checkMask: Bitboard,
  checkers: Bitboard,
  checkCount: number,
  attackTargets: Bitboard,
  pawnOriginSquare: number,
): void => {
  const originSquareBitboard = squareBitboards[pawnOriginSquare];

  if (ctx.enPassantSquare === null) {
    return;
  }

  const enPassantBitboard = squareBitboards[ctx.enPassantSquare];

  if ((attackTargets & enPassantBitboard) === 0n) {
    return;
  }

  const targetEnPassantPawnSquare =
    ctx.color === COLOR.WHITE
      ? ctx.enPassantSquare - 8
      : ctx.enPassantSquare + 8;
  const targetEnPassantPawnBitboard =
    squareBitboards[targetEnPassantPawnSquare];

  if (checkCount === 1) {
    const isCapturedPawnChecker =
      (checkers & targetEnPassantPawnBitboard) !== 0n;

    const enPassantTargetBlocksSliderCheck =
      (checkMask & enPassantBitboard) !== 0n;

    if (!isCapturedPawnChecker && !enPassantTargetBlocksSliderCheck) {
      return;
    }
  }

  const enemyColor = getOppositeColor(ctx.color);

  // Verify pawn exists
  if (
    ctx.pieceAt[targetEnPassantPawnSquare] !==
    calculatePieceIndex(enemyColor, PAWN_INDEX)
  ) {
    return;
  }

  const isEnPassantMoveLegal = isOwnKingSafeAfterEnPassant(
    ctx.allOccupancy,
    ctx.state,
    originSquareBitboard,
    targetEnPassantPawnBitboard,
    enPassantBitboard,
    ctx.ownKingSquare,
    enemyColor,
  );

  if (!isEnPassantMoveLegal) {
    return;
  }

  addMove(
    ctx.moves,
    encodeMove(
      pawnOriginSquare,
      ctx.enPassantSquare,
      ctx.color,
      PAWN_INDEX,
      MOVE_FLAG.EN_PASSANT,
      PAWN_INDEX,
    ),
  );
};

export default generateEnPassantMove;
