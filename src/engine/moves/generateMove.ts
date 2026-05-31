/**
 * This generates all pseudo legal moves for the a piece.
 * First, we generate the bitboard for all legal attacks for the piece
 * Since the attacks are based on an empty board, we remove all of the own pieces
 * We differentiate between capture targets and quiet moves for move highlighting
 */

import type { GenerateAttacksFn } from "../attacks/types";
import { FULL_BOARD_MASK } from "../constants/mask";
import forEachBitGetSquare from "../helpers/forEachBitGetSquare";
import getPieceAtSquare from "../helpers/getPieceAtSquare";
import { calculatePieceIndex } from "../state/initialState";
import { MOVE_FLAG, type Move } from "../types/main";
import type { MoveGenerationContext } from "./types";

const generateMove = (ctx: MoveGenerationContext, pieceIndex: number, generateAttacksFn: GenerateAttacksFn): Move[] => {
  const moves: Move[] = [];
  const emptySquares = ~ctx.allOccupancy & FULL_BOARD_MASK;

  const piece = ctx.state[calculatePieceIndex(ctx.color, pieceIndex)];

  forEachBitGetSquare(piece, (originSquare) => {
    const attacks = generateAttacksFn(originSquare, ctx.allOccupancy);
    const targets = attacks & ~ctx.ownOccupancy;

    const captureTargets = targets & ctx.enemyOccupancy;
    const quietTargets = targets & emptySquares;

    forEachBitGetSquare(captureTargets, (captureTargetSquare) => {
      moves.push({
        color: ctx.color,
        flag: MOVE_FLAG.CAPTURE,
        from: originSquare,
        to: captureTargetSquare,
        piece: pieceIndex,
        capturedPiece: getPieceAtSquare(ctx.state, captureTargetSquare)?.piece,
      });
    });

    forEachBitGetSquare(quietTargets, (quietTargetSquare) => {
      moves.push({
        color: ctx.color,
        flag: MOVE_FLAG.QUIET,
        from: originSquare,
        to: quietTargetSquare,
        piece: pieceIndex,
      });
    });
  });

  return moves;
}

export default generateMove;