import getOppositeColor from "../../helpers/getOppositeColor";
import { encodeMove } from "../../position/moves/packedMove";
import { addMove } from "../moveList";
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
  if (ctx.enPassantSquare === null) {
    return;
  }

  const enPassantBitboardLo = squareBitboardsLo[ctx.enPassantSquare];
  const enPassantBitboardHi = squareBitboardsHi[ctx.enPassantSquare];

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
      ? ctx.enPassantSquare - 8
      : ctx.enPassantSquare + 8;

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
