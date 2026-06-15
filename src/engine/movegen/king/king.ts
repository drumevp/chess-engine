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

const attackScratch: Bitboard32 = { lo: 0, hi: 0 };
const kingattackScratch: Bitboard32 = { lo: 0, hi: 0 };

const generateKingMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
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
    attackScratch,
  );

  // Targets
  attackScratch.lo = (attackScratch.lo & ~ctx.ownOccupancyLo) >>> 0;
  attackScratch.hi = (attackScratch.hi & ~ctx.ownOccupancyHi) >>> 0;

  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;

  const captureTargetsLo = (attackScratch.lo & ctx.enemyOccupancyLo) >>> 0;
  const captureTargetsHi = (attackScratch.hi & ctx.enemyOccupancyHi) >>> 0;

  const quietTargetsLo = (attackScratch.lo & emptySquaresLo) >>> 0;
  const quietTargetsHi = (attackScratch.hi & emptySquaresHi) >>> 0;

  forEachBitGetSquare(
    captureTargetsLo,
    captureTargetsHi,
    (captureTargetSquare) => {
      const capturedPiece = ctx.pieceAt[captureTargetSquare];

      if (capturedPiece === -1) {
        throw new Error("Invalid captured piece");
      }

      if (
        isSquareAttackedWithOccupancy(
          captureTargetSquare,
          enemyColor,
          ctx.stateLo,
          ctx.stateHi,
          occupancyWithoutOwnKingLo,
          occupancyWithoutOwnKingHi,
          kingattackScratch,
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
    if (
      isSquareAttackedWithOccupancy(
        quietTargetSquare,
        enemyColor,
        ctx.stateLo,
        ctx.stateHi,
        occupancyWithoutOwnKingLo,
        occupancyWithoutOwnKingHi,
        attackScratch,
      )
    ) {
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
