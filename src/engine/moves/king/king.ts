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
import { FULL_BOARD_MASK } from "../../constants/mask";
import forEachBitGetSquare from "../../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../../helpers/getPieceTypeFromStateIndex ";
import { encodeMove } from "../../packedMove/main";
import { KING_INDEX } from "../../state/initialState";
import { MOVE_FLAG } from "../../types/main";
import type { AttackInfo } from "../attackInfo/types";
import type { MoveGenerationContext } from "../types";
import generateCastlingMoves from "./castling/generateCastlingMoves";

const generateKingMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  const attacks = generateKingAttacks(ctx.ownKingSquare, ctx.allOccupancy);
  let targets = attacks & (FULL_BOARD_MASK ^ ctx.ownOccupancy);
  targets = targets & (FULL_BOARD_MASK ^ attackInfo.enemyAttackedSquares);

  const emptySquares = ~ctx.allOccupancy & FULL_BOARD_MASK;
  const captureTargets = targets & ctx.enemyOccupancy;
  const quietTargets = targets & emptySquares;

  forEachBitGetSquare(captureTargets, (captureTargetSquare) => {
    const capturedPiece = ctx.pieceAt[captureTargetSquare];

    if (capturedPiece === -1) {
      throw new Error('Invalid captured piece');
    }

    ctx.moves.push(
      encodeMove(ctx.ownKingSquare, captureTargetSquare, ctx.color, KING_INDEX, MOVE_FLAG.CAPTURE, getPieceTypeFromStateIndex(capturedPiece)));
  });

  forEachBitGetSquare(quietTargets, (quietTargetSquare) => {
    ctx.moves.push(
      encodeMove(ctx.ownKingSquare, quietTargetSquare, ctx.color, KING_INDEX, MOVE_FLAG.QUIET))
  });

  generateCastlingMoves(ctx, attackInfo);
}

export default generateKingMoves;