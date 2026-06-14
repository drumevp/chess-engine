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
import { KING_INDEX } from "../../constants/piece";
import forEachBitGetSquare from "../../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../../helpers/getPieceTypeFromStateIndex";
import getOppositeColor from "../../helpers/getOppositeColor";
import isSquareAttackedWithOccupancy from "../../helpers/isSquareAttackedWithOccupancy";
import { encodeMove } from "../../position/moves/packedMove";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";
import { AttackInfo } from "../../types/attackInfo";
import { Bitboard32 } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";
import { addMove } from "../moveList";
import generateCastlingMoves from "./castling/generateCastlingMoves";

const generateKingMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const scratch: Bitboard32 = { lo: 0, hi: 0 };
  const attackScratch: Bitboard32 = { lo: 0, hi: 0 };
  const enemyColor = getOppositeColor(ctx.color);
  const originSquareBitboardLo = squareBitboardsLo[ctx.ownKingSquare];
  const originSquareBitboardHi = squareBitboardsHi[ctx.ownKingSquare];

  generateKingAttacks(
    ctx.ownKingSquare,
    ctx.allOccupancyLo,
    ctx.allOccupancyHi,
    scratch,
  );

  // Targets
  scratch.lo = (scratch.lo & ~ctx.ownOccupancyLo) >>> 0;
  scratch.hi = (scratch.hi & ~ctx.ownOccupancyHi) >>> 0;

  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;

  const captureTargetsLo = (scratch.lo & ctx.enemyOccupancyLo) >>> 0;
  const captureTargetsHi = (scratch.hi & ctx.enemyOccupancyHi) >>> 0;

  const quietTargetsLo = (scratch.lo & emptySquaresLo) >>> 0;
  const quietTargetsHi = (scratch.hi & emptySquaresHi) >>> 0;

  const isKingTargetSafe = (
    targetSquare: number,
    ignoredAttackerLo = 0,
    ignoredAttackerHi = 0,
  ): boolean => {
    const targetSquareBitboardLo = squareBitboardsLo[targetSquare];
    const targetSquareBitboardHi = squareBitboardsHi[targetSquare];

    const occupancyAfterKingMoveLo =
      ((ctx.allOccupancyLo & ~originSquareBitboardLo) |
        targetSquareBitboardLo) >>>
      0;
    const occupancyAfterKingMoveHi =
      ((ctx.allOccupancyHi & ~originSquareBitboardHi) |
        targetSquareBitboardHi) >>>
      0;

    return !isSquareAttackedWithOccupancy(
      targetSquare,
      enemyColor,
      ctx.stateLo,
      ctx.stateHi,
      occupancyAfterKingMoveLo,
      occupancyAfterKingMoveHi,
      attackScratch,
      ignoredAttackerLo,
      ignoredAttackerHi,
    );
  };

  forEachBitGetSquare(
    captureTargetsLo,
    captureTargetsHi,
    (captureTargetSquare) => {
      const capturedPiece = ctx.pieceAt[captureTargetSquare];

      if (capturedPiece === -1) {
        throw new Error("Invalid captured piece");
      }

      if (
        !isKingTargetSafe(
          captureTargetSquare,
          squareBitboardsLo[captureTargetSquare],
          squareBitboardsHi[captureTargetSquare],
        )
      ) {
        return;
      }

      addMove(
        ctx.moves,
        encodeMove(
          ctx.ownKingSquare,
          captureTargetSquare,
          ctx.color,
          KING_INDEX,
          MOVE_FLAG.CAPTURE,
          getPieceTypeFromStateIndex(capturedPiece),
        ),
      );
    },
  );

  forEachBitGetSquare(quietTargetsLo, quietTargetsHi, (quietTargetSquare) => {
    if (!isKingTargetSafe(quietTargetSquare)) {
      return;
    }

    addMove(
      ctx.moves,
      encodeMove(
        ctx.ownKingSquare,
        quietTargetSquare,
        ctx.color,
        KING_INDEX,
        MOVE_FLAG.QUIET,
      ),
    );
  });

  generateCastlingMoves(ctx, attackInfo);
};

export default generateKingMoves;
