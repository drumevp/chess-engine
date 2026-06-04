/**
 * This generates all pseudo legal moves for the a piece.
 * First, we generate the bitboard for all legal attacks for the piece
 * Since the attacks are based on an empty board, we remove all of the own pieces
 * We differentiate between capture targets and quiet moves for move highlighting
 */

import type { GenerateAttacksFn } from "../attacks/types";
import { FULL_BOARD_MASK } from "../constants/mask";
import forEachBitGetSquare from "../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../helpers/getPieceTypeFromStateIndex ";
import { squareBitboards } from "../lookupTables/importedPrecalculatedData";
import { encodeMove } from "../packedMove/main";
import { calculatePieceIndex } from "../state/initialState";
import { MOVE_FLAG } from "../types/main";
import type { AttackInfo } from "./attackInfo/types";
import { addMove } from "./moveList";
import type { MoveGenerationContext } from "./types";

const generateMove = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
  pieceIndex: number,
  generateAttacksFn: GenerateAttacksFn,
): void => {
  const emptySquares = ~ctx.allOccupancy & FULL_BOARD_MASK;

  const pieces = ctx.state[calculatePieceIndex(ctx.color, pieceIndex)];

  forEachBitGetSquare(pieces, (originSquare) => {
    const attacks = generateAttacksFn(originSquare, ctx.allOccupancy);
    const pseudoTargets = attacks & ~ctx.ownOccupancy;
    let targets = pseudoTargets & attackInfo.checkMask;

    // Get whether this piece is pinned
    const isPinned =
      (attackInfo.pinnedPieces & squareBitboards[originSquare]) !== 0n;

    // If pinned, limit the moves to moves that resolve check
    if (isPinned) {
      targets = targets & attackInfo.pinRaysBySquare[originSquare];
    }

    const captureTargets = targets & ctx.enemyOccupancy;
    const quietTargets = targets & emptySquares;

    forEachBitGetSquare(captureTargets, (captureTargetSquare) => {
      const capturedPiece = ctx.pieceAt[captureTargetSquare];

      if (capturedPiece === -1) {
        throw new Error("Invalid captured piece");
      }

      addMove(
        ctx.moves,
        encodeMove(
          originSquare,
          captureTargetSquare,
          ctx.color,
          pieceIndex,
          MOVE_FLAG.CAPTURE,
          getPieceTypeFromStateIndex(capturedPiece),
        ),
      );
    });

    forEachBitGetSquare(quietTargets, (quietTargetSquare) => {
      addMove(
        ctx.moves,
        encodeMove(
          originSquare,
          quietTargetSquare,
          ctx.color,
          pieceIndex,
          MOVE_FLAG.QUIET,
        ),
      );
    });
  });
};

export default generateMove;
