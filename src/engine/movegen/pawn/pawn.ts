/**
 * Pawn movement logic
 *
 * set of possibilities:
 * - single pawn push (if square in front is empty)
 * - double pawn push (if both squares are empty and white pawn is on RANK 2)
 * - captures (when there is enemy occupancy in the NW and NE directions)
 * - promotion should be nested within single pawn push and captures
 *    - When pushing the white pawn to the 8th rank, can promote to KNIGHT, ROOK, BISHOP, QUEEN
 *    - When capturing and ending up on the 8th rank, can promote to -||-
 * - en pessant (implement later), it requires more state from the engine, since en pessant is only legal for the move after the enemy pawns have moved
 *   2 squares
 */

import generateBlackPawnAttacks from "../../attacks/blackPawn";
import generateWhitePawnAttacks from "../../attacks/whitePawn";
import forEachBitGetSquare from "../../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../../helpers/getPieceTypeFromStateIndex";
import { getCurrentRank } from "../../helpers/main";
import {
  ENCODE_MOVE_NO_PIECE,
  encodeMove,
} from "../../position/moves/packedMove";
import { addMove } from "../moveList";
import generateEnPassantMove from "./generateEnPassantMove";
import { AttackInfo } from "../../types/attackInfo";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import { PAWN_INDEX, VALID_PROMOTION_PIECES } from "../../constants/piece";
import { PAWN_CONFIG } from "../../constants/pawnConfig";
import { MoveGenerationContext } from "../../types/move";
import { MOVE_FLAG } from "../../constants/move";
import { COLOR } from "../../constants/color";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";
import { Bitboard32 } from "../../types/bitboard";

const attakScratch: Bitboard32 = { lo: 0, hi: 0 };
const enPassantScratch: Bitboard32 = { lo: 0, hi: 0 };

const generatePawnMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const pawnsLo = ctx.stateLo[calculatePieceIndex(ctx.color, PAWN_INDEX)];
  const pawnsHi = ctx.stateHi[calculatePieceIndex(ctx.color, PAWN_INDEX)];

  const pawnConfig = PAWN_CONFIG[ctx.color];
  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;

  const attacksFn =
    ctx.color === COLOR.WHITE
      ? generateWhitePawnAttacks
      : generateBlackPawnAttacks;

  forEachBitGetSquare(pawnsLo, pawnsHi, (originSquare) => {
    /**
     * MOVEMENT
     */
    const originSquareBitboardLo = squareBitboardsLo[originSquare];
    const originSquareBitboardHi = squareBitboardsHi[originSquare];

    const currentRank = getCurrentRank(originSquare);

    const singlePushOffset = ctx.color === COLOR.WHITE ? 8 : -8;
    const doublePushOffset = ctx.color === COLOR.WHITE ? 16 : -16;

    const oneMoveForwardSquare = originSquare + singlePushOffset;
    const oneMoveForwardLo = squareBitboardsLo[oneMoveForwardSquare];
    const oneMoveForwardHi = squareBitboardsHi[oneMoveForwardSquare];

    const oneMoveForwardSquareIsEmpty =
      (oneMoveForwardLo & emptySquaresLo) >>> 0 !== 0 ||
      (oneMoveForwardHi & emptySquaresHi) >>> 0 !== 0;

    const oneMoveForwardSquareIsInsideCheckmask =
      (oneMoveForwardLo & attackInfo.checkMaskLo) >>> 0 !== 0 ||
      (oneMoveForwardHi & attackInfo.checkMaskHi) >>> 0 !== 0;

    const isPinned =
      (attackInfo.pinnedPiecesLo & originSquareBitboardLo) >>> 0 !== 0 ||
      (attackInfo.pinnedPiecesHi & originSquareBitboardHi) >>> 0 !== 0;

    const pinRayFromOriginSquareLo = attackInfo.pinRaysBySquareLo[originSquare];
    const pinRayFromOriginSquareHi = attackInfo.pinRaysBySquareHi[originSquare];

    let isPinPreventingOneMoveForward: boolean = false;

    if (isPinned) {
      isPinPreventingOneMoveForward =
        ((oneMoveForwardLo & pinRayFromOriginSquareLo) |
          (oneMoveForwardHi & pinRayFromOriginSquareHi)) >>>
          0 ===
        0;
    }

    // ONE SQUARE
    if (
      oneMoveForwardSquareIsEmpty &&
      oneMoveForwardSquareIsInsideCheckmask &&
      !isPinPreventingOneMoveForward
    ) {
      const targetSquareRank = getCurrentRank(oneMoveForwardSquare);

      // Promotion movement case
      if (targetSquareRank === pawnConfig.promotionRank) {
        VALID_PROMOTION_PIECES.forEach((promotionPieceIndex) => {
          addMove(
            ctx.moves,
            encodeMove(
              originSquare,
              oneMoveForwardSquare,
              ctx.color,
              PAWN_INDEX,
              MOVE_FLAG.PROMOTION,
              ENCODE_MOVE_NO_PIECE,
              promotionPieceIndex,
            ),
          );
        });
      } else {
        addMove(
          ctx.moves,
          encodeMove(
            originSquare,
            oneMoveForwardSquare,
            ctx.color,
            PAWN_INDEX,
            MOVE_FLAG.QUIET,
          ),
        );
      }
    }

    // TWO SQUARES
    if (currentRank === pawnConfig.originRank) {
      // attakScratch = twoMovesForwardBitboard
      const twoMovesForwardSquare = originSquare + doublePushOffset;
      const twoMovesForwardLo = squareBitboardsLo[twoMovesForwardSquare];
      const twoMovesForwardHi = squareBitboardsHi[twoMovesForwardSquare];

      const twoMovesForwardSquareIsEmpty =
        (twoMovesForwardLo & emptySquaresLo) >>> 0 !== 0 ||
        (twoMovesForwardHi & emptySquaresHi) >>> 0 !== 0;

      const twoMovesForwardSquareIsInsideCheckmask =
        (twoMovesForwardLo & attackInfo.checkMaskLo) >>> 0 !== 0 ||
        (twoMovesForwardHi & attackInfo.checkMaskHi) >>> 0 !== 0;

      let isPinPreventingTwoMovesForward: boolean = false;

      if (isPinned) {
        isPinPreventingTwoMovesForward =
          ((twoMovesForwardLo & pinRayFromOriginSquareLo) |
            (twoMovesForwardHi & pinRayFromOriginSquareHi)) >>>
            0 ===
          0;
      }

      if (
        oneMoveForwardSquareIsEmpty &&
        twoMovesForwardSquareIsEmpty &&
        twoMovesForwardSquareIsInsideCheckmask &&
        !isPinPreventingOneMoveForward &&
        !isPinPreventingTwoMovesForward
      ) {
        addMove(
          ctx.moves,
          encodeMove(
            originSquare,
            twoMovesForwardSquare,
            ctx.color,
            PAWN_INDEX,
            MOVE_FLAG.DOUBLE_PAWN_PUSH,
          ),
        );
      }
    }

    /**
     * ATTACKS
     */
    // attakScratch = targets
    attacksFn(
      originSquare,
      ctx.allOccupancyLo,
      ctx.allOccupancyHi,
      attakScratch,
    );

    if (isPinned) {
      attakScratch.lo &= pinRayFromOriginSquareLo;
      attakScratch.hi &= pinRayFromOriginSquareHi;
    }

    /**
     * En Pessant logic
     */
    generateEnPassantMove(
      ctx,
      attackInfo.checkMaskLo,
      attackInfo.checkMaskHi,
      attackInfo.checkersLo,
      attackInfo.checkersHi,
      attackInfo.checkCount,
      attakScratch.lo,
      attakScratch.hi,
      originSquare,
      originSquareBitboardLo,
      originSquareBitboardHi,
      enPassantScratch,
    );

    attakScratch.lo &= attackInfo.checkMaskLo;
    attakScratch.hi &= attackInfo.checkMaskHi;

    attakScratch.lo &= ctx.enemyOccupancyLo;
    attakScratch.hi &= ctx.enemyOccupancyHi;

    forEachBitGetSquare(attakScratch.lo, attakScratch.hi, (targetSquare) => {
      const capturedPiece = ctx.pieceAt[targetSquare];

      if (capturedPiece === -1) {
        throw new Error("Invalid captured piece");
      }

      const targetSquareRank = getCurrentRank(targetSquare);

      if (targetSquareRank === pawnConfig.promotionRank) {
        VALID_PROMOTION_PIECES.forEach((promotionPieceIndex) => {
          addMove(
            ctx.moves,
            encodeMove(
              originSquare,
              targetSquare,
              ctx.color,
              PAWN_INDEX,
              MOVE_FLAG.PROMOTION_CAPTURE,
              getPieceTypeFromStateIndex(capturedPiece),
              promotionPieceIndex,
            ),
          );
        });
      } else {
        addMove(
          ctx.moves,
          encodeMove(
            originSquare,
            targetSquare,
            ctx.color,
            PAWN_INDEX,
            MOVE_FLAG.CAPTURE,
            getPieceTypeFromStateIndex(capturedPiece),
          ),
        );
      }
    });
  });
};

export default generatePawnMoves;
