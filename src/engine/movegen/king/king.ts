/**
 * Generate king legal moves
 *
 * Capture & quiet moves are done by taking the king attacks bitboard
 * We remove own occupancy and enemy attack squares from the king attack bitboard
 *
 * The remaining moves either attack enemy pieces (enemy occupancy) or are legal moves to quiet squares
 *
 */

import generateKingAttacks from "../../attacks/king";
import { MOVE_FLAG } from "../../constants/move";
import { KING_INDEX, NUMBER_OF_PIECE_CATEGORIES } from "../../constants/piece";
import getOppositeColor from "../../helpers/getOppositeColor";
import isSquareAttackedWithOccupancy from "../../helpers/isSquareAttackedWithOccupancy";
import { ENCODE_MOVE_NO_PIECE } from "../../position/moves/packedMove";
import { AttackInfo } from "../../types/attackInfo";
import { Bitboard32 } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";
import generateCastlingMoves from "./castling/generateCastlingMoves";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";

const attackScratch: Bitboard32 = { lo: 0, hi: 0 };
const kingScratch: Bitboard32 = { lo: 0, hi: 0 };
const NO_PIECE_ENCODED =
  (ENCODE_MOVE_NO_PIECE << 16) | (ENCODE_MOVE_NO_PIECE << 19);

const generateKingMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
  capturesAndPromotionsOnly = false,
): void => {
  const enemyColor = getOppositeColor(ctx.color);
  const originSquareBitboardLo = squareBitboardsLo[ctx.ownKingSquare];
  const originSquareBitboardHi = squareBitboardsHi[ctx.ownKingSquare];
  const occupancyWithoutOwnKingLo =
    (ctx.allOccupancyLo & ~originSquareBitboardLo) >>> 0;
  const occupancyWithoutOwnKingHi =
    (ctx.allOccupancyHi & ~originSquareBitboardHi) >>> 0;

  generateKingAttacks(
    ctx.ownKingSquare,
    ctx.allOccupancyLo,
    ctx.allOccupancyHi,
    kingScratch,
  );

  // Targets
  kingScratch.lo = (kingScratch.lo & ~ctx.ownOccupancyLo) >>> 0;
  kingScratch.hi = (kingScratch.hi & ~ctx.ownOccupancyHi) >>> 0;

  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;

  const captureTargetsLo = (kingScratch.lo & ctx.enemyOccupancyLo) >>> 0;
  const captureTargetsHi = (kingScratch.hi & ctx.enemyOccupancyHi) >>> 0;

  const quietTargetsLo = (kingScratch.lo & emptySquaresLo) >>> 0;
  const quietTargetsHi = (kingScratch.hi & emptySquaresHi) >>> 0;
  const moveList = ctx.moves;
  const moves = moveList.moves;
  let moveCount = moveList.count;
  const colorAndKingBits = (ctx.color << 12) | (KING_INDEX << 13);
  const quietMoveBits = colorAndKingBits | NO_PIECE_ENCODED;
  const captureMoveBits =
    colorAndKingBits |
    (ENCODE_MOVE_NO_PIECE << 19) |
    (MOVE_FLAG.CAPTURE << 22);

  let targets = captureTargetsLo;
  while (targets !== 0) {
    const targetLsb = targets & -targets;
    const captureTargetSquare = 31 - Math.clz32(targetLsb);
    const capturedPiece = ctx.pieceAt[captureTargetSquare];

    if (
      !isSquareAttackedWithOccupancy(
        captureTargetSquare,
        enemyColor,
        ctx.stateLo,
        ctx.stateHi,
        occupancyWithoutOwnKingLo,
        occupancyWithoutOwnKingHi,
        attackScratch,
        squareBitboardsLo[captureTargetSquare],
        squareBitboardsHi[captureTargetSquare],
      )
    ) {
      moves[moveCount++] =
        ctx.ownKingSquare |
        (captureTargetSquare << 6) |
        captureMoveBits |
        ((capturedPiece >= NUMBER_OF_PIECE_CATEGORIES
          ? capturedPiece - NUMBER_OF_PIECE_CATEGORIES
          : capturedPiece) <<
          16);
    }

    targets = (targets & (targets - 1)) >>> 0;
  }

  targets = captureTargetsHi;
  while (targets !== 0) {
    const targetLsb = targets & -targets;
    const captureTargetSquare = 63 - Math.clz32(targetLsb);
    const capturedPiece = ctx.pieceAt[captureTargetSquare];

    if (
      !isSquareAttackedWithOccupancy(
        captureTargetSquare,
        enemyColor,
        ctx.stateLo,
        ctx.stateHi,
        occupancyWithoutOwnKingLo,
        occupancyWithoutOwnKingHi,
        attackScratch,
        squareBitboardsLo[captureTargetSquare],
        squareBitboardsHi[captureTargetSquare],
      )
    ) {
      moves[moveCount++] =
        ctx.ownKingSquare |
        (captureTargetSquare << 6) |
        captureMoveBits |
        ((capturedPiece >= NUMBER_OF_PIECE_CATEGORIES
          ? capturedPiece - NUMBER_OF_PIECE_CATEGORIES
          : capturedPiece) <<
          16);
    }

    targets = (targets & (targets - 1)) >>> 0;
  }

  if (capturesAndPromotionsOnly) {
    moveList.count = moveCount;

    return;
  }

  targets = quietTargetsLo;
  while (targets !== 0) {
    const targetLsb = targets & -targets;
    const quietTargetSquare = 31 - Math.clz32(targetLsb);

    if (
      !isSquareAttackedWithOccupancy(
        quietTargetSquare,
        enemyColor,
        ctx.stateLo,
        ctx.stateHi,
        occupancyWithoutOwnKingLo,
        occupancyWithoutOwnKingHi,
        attackScratch,
      )
    ) {
      moves[moveCount++] =
        ctx.ownKingSquare | (quietTargetSquare << 6) | quietMoveBits;
    }

    targets = (targets & (targets - 1)) >>> 0;
  }

  targets = quietTargetsHi;
  while (targets !== 0) {
    const targetLsb = targets & -targets;
    const quietTargetSquare = 63 - Math.clz32(targetLsb);

    if (
      !isSquareAttackedWithOccupancy(
        quietTargetSquare,
        enemyColor,
        ctx.stateLo,
        ctx.stateHi,
        occupancyWithoutOwnKingLo,
        occupancyWithoutOwnKingHi,
        attackScratch,
      )
    ) {
      moves[moveCount++] =
        ctx.ownKingSquare | (quietTargetSquare << 6) | quietMoveBits;
    }

    targets = (targets & (targets - 1)) >>> 0;
  }

  moveList.count = moveCount;
  generateCastlingMoves(ctx, attackInfo);
};

export default generateKingMoves;
