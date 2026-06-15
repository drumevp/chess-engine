import getOppositeColor from "../../helpers/getOppositeColor";
import { ENCODE_MOVE_NO_PIECE } from "../../position/moves/packedMove";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import { PAWN_INDEX } from "../../constants/piece";
import { MoveGenerationContext } from "../../types/move";
import { COLOR } from "../../constants/color";
import { MOVE_FLAG } from "../../constants/move";
import isOwnKingSafeAfterEnPassant from "./isOwnKingSafeAfterEnPassant";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";
import { Bitboard32 } from "../../types/bitboard";

const generateEnPassantMove = (
  ctx: MoveGenerationContext,
  checkMaskLo: number,
  checkMaskHi: number,
  checkersLo: number,
  checkersHi: number,
  checkCount: number,
  attackTargetsLo: number,
  attackTargetsHi: number,
  pawnOriginSquare: number,
  originSquareBitboardLo: number,
  originSquareBitboardHi: number,
  out: Bitboard32,
): void => {
  const enPassantSquare = ctx.enPassantSquare;

  if (enPassantSquare === null) {
    return;
  }

  const enPassantBitboardLo = squareBitboardsLo[enPassantSquare];
  const enPassantBitboardHi = squareBitboardsHi[enPassantSquare];

  if (
    ((attackTargetsLo & enPassantBitboardLo) |
      (attackTargetsHi & enPassantBitboardHi)) >>>
      0 ===
    0
  ) {
    return;
  }

  const targetEnPassantPawnSquare =
    ctx.color === COLOR.WHITE
      ? enPassantSquare - 8
      : enPassantSquare + 8;

  const targetEnPassantPawnBitboardLo =
    squareBitboardsLo[targetEnPassantPawnSquare];

  const targetEnPassantPawnBitboardHi =
    squareBitboardsHi[targetEnPassantPawnSquare];

  if (checkCount === 1) {
    const isCapturedPawnChecker =
      ((checkersLo & targetEnPassantPawnBitboardLo) |
        (checkersHi & targetEnPassantPawnBitboardHi)) >>>
        0 !==
      0;

    const enPassantTargetBlocksSliderCheck =
      ((checkMaskLo & enPassantBitboardLo) |
        (checkMaskHi & enPassantBitboardHi)) >>>
        0 !==
      0;

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
    ctx.allOccupancyLo,
    ctx.allOccupancyHi,
    ctx.stateLo,
    ctx.stateHi,
    originSquareBitboardLo,
    originSquareBitboardHi,
    targetEnPassantPawnBitboardLo,
    targetEnPassantPawnBitboardHi,
    enPassantBitboardLo,
    enPassantBitboardHi,
    ctx.ownKingSquare,
    enemyColor,
    out,
  );

  if (!isEnPassantMoveLegal) {
    return;
  }

  ctx.moves.moves[ctx.moves.count++] =
    pawnOriginSquare |
    (enPassantSquare << 6) |
    (ctx.color << 12) |
    (PAWN_INDEX << 13) |
    (PAWN_INDEX << 16) |
    (ENCODE_MOVE_NO_PIECE << 19) |
    (MOVE_FLAG.EN_PASSANT << 22);
};

export default generateEnPassantMove;
