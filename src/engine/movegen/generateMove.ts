/**
 * This generates all pseudo legal moves for the a piece.
 * First, we generate the bitboard for all legal attacks for the piece
 * Since the attacks are based on an empty board, we remove all of the own pieces
 * We differentiate between capture targets and quiet moves for move highlighting
 */

import forEachBitGetSquare from "../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../helpers/getPieceTypeFromStateIndex";
import { encodeMove } from "../position/moves/packedMove";
import { addMove } from "./moveList";
import { GenerateAttacksFn } from "../types/attacks";
import { AttackInfo } from "../types/attackInfo";
import calculatePieceIndex from "../helpers/calculatePieceIndex";
import { MoveGenerationContext } from "../types/move";
import { MOVE_FLAG } from "../constants/move";
import { Bitboard32 } from "../types/bitboard";
import { squareBitboardsHi, squareBitboardsLo } from "../tables/importTables";

const attackScratch: Bitboard32 = { lo: 0, hi: 0 };

const generateMove = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
  pieceIndex: number,
  generateAttacksFn: GenerateAttacksFn,
): void => {
  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;

  const stateIndex = calculatePieceIndex(ctx.color, pieceIndex);
  const piecesLo = ctx.stateLo[stateIndex];
  const piecesHi = ctx.stateHi[stateIndex];

  forEachBitGetSquare(piecesLo, piecesHi, (originSquare) => {
    generateAttacksFn(
      originSquare,
      ctx.allOccupancyLo,
      ctx.allOccupancyHi,
      attackScratch,
    );

    const pseudoTargetsLo = (attackScratch.lo & ~ctx.ownOccupancyLo) >>> 0;
    const pseudoTargetsHi = (attackScratch.hi & ~ctx.ownOccupancyHi) >>> 0;

    let targetsLo = (pseudoTargetsLo & attackInfo.checkMaskLo) >>> 0;
    let targetsHi = (pseudoTargetsHi & attackInfo.checkMaskHi) >>> 0;

    const originLo = squareBitboardsLo[originSquare];
    const originHi = squareBitboardsHi[originSquare];
    const isPinned =
      ((attackInfo.pinnedPiecesLo & originLo) |
        (attackInfo.pinnedPiecesHi & originHi)) !==
      0;

    if (isPinned) {
      targetsLo =
        (targetsLo & attackInfo.pinRaysBySquareLo[originSquare]) >>> 0;
      targetsHi =
        (targetsHi & attackInfo.pinRaysBySquareHi[originSquare]) >>> 0;
    }

    const captureTargetsLo = (targetsLo & ctx.enemyOccupancyLo) >>> 0;
    const captureTargetsHi = (targetsHi & ctx.enemyOccupancyHi) >>> 0;

    const quietTargetsLo = (targetsLo & emptySquaresLo) >>> 0;
    const quietTargetsHi = (targetsHi & emptySquaresHi) >>> 0;

    forEachBitGetSquare(
      captureTargetsLo,
      captureTargetsHi,
      (captureTargetSquare) => {
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
      },
    );

    forEachBitGetSquare(quietTargetsLo, quietTargetsHi, (quietTargetSquare) => {
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
