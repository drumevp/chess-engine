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
import {
  BISHOP_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../constants/piece";
import { PAWN_CONFIG } from "../../constants/pawnConfig";
import { MoveGenerationContext } from "../../types/move";
import { MOVE_FLAG } from "../../constants/move";
import { COLOR } from "../../constants/color";
import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";
import { Bitboard32 } from "../../types/bitboard";
import getSingleBitSquare from "../../helpers/getSingleBitSquare";

const generatePawnMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const pawnsLo = ctx.stateLo[calculatePieceIndex(ctx.color, PAWN_INDEX)];
  const pawnsHi = ctx.stateHi[calculatePieceIndex(ctx.color, PAWN_INDEX)];

  const pawnConfig = PAWN_CONFIG[ctx.color];
  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;

  const bitboardScratch: Bitboard32 = { lo: 0, hi: 0 };
  const enPassantScratch: Bitboard32 = { lo: 0, hi: 0 };
  const attacksFn =
    ctx.color === COLOR.WHITE ? generateWhitePawnAttacks : generateBlackPawnAttacks;

  forEachBitGetSquare(pawnsLo, pawnsHi, (originSquare) => {
    /**
     * MOVEMENT
     */
    const originSquareBitboardLo = squareBitboardsLo[originSquare];
    const originSquareBitboardHi = squareBitboardsHi[originSquare];

    const currentRank = getCurrentRank(originSquare);

    pawnConfig.moveForwardOneSquareFn(
      originSquareBitboardLo,
      originSquareBitboardHi,
      bitboardScratch,
    );

    const oneMoveForwardSquareIsEmpty =
      (bitboardScratch.lo & emptySquaresLo) >>> 0 !== 0 ||
      (bitboardScratch.hi & emptySquaresHi) >>> 0 !== 0;

    const oneMoveForwardSquareIsInsideCheckmask =
      (bitboardScratch.lo & attackInfo.checkMaskLo) >>> 0 !== 0 ||
      (bitboardScratch.hi & attackInfo.checkMaskHi) >>> 0 !== 0;

    const isPinned =
      (attackInfo.pinnedPiecesLo & originSquareBitboardLo) >>> 0 !== 0 ||
      (attackInfo.pinnedPiecesHi & originSquareBitboardHi) >>> 0 !== 0;

    const pinRayFromOriginSquareLo = attackInfo.pinRaysBySquareLo[originSquare];
    const pinRayFromOriginSquareHi = attackInfo.pinRaysBySquareHi[originSquare];

    let isPinPreventingOneMoveForward: boolean = false;

    if (isPinned) {
      isPinPreventingOneMoveForward =
        ((bitboardScratch.lo & pinRayFromOriginSquareLo) |
          (bitboardScratch.hi & pinRayFromOriginSquareHi)) >>>
          0 ===
        0;
    }

    // ONE SQUARE
    if (
      oneMoveForwardSquareIsEmpty &&
      oneMoveForwardSquareIsInsideCheckmask &&
      !isPinPreventingOneMoveForward
    ) {
      const targetSquare = getSingleBitSquare(
        bitboardScratch.lo,
        bitboardScratch.hi,
      );

      if (targetSquare === undefined) {
        throw new Error("Invalid bitboard");
      }

      const targetSquareRank = getCurrentRank(targetSquare);

      // Promotion movement case
      if (targetSquareRank === pawnConfig.promotionRank) {
        [KNIGHT_INDEX, QUEEN_INDEX, ROOK_INDEX, BISHOP_INDEX].forEach(
          (promotionPieceIndex) => {
            addMove(
              ctx.moves,
              encodeMove(
                originSquare,
                targetSquare,
                ctx.color,
                PAWN_INDEX,
                MOVE_FLAG.PROMOTION,
                ENCODE_MOVE_NO_PIECE,
                promotionPieceIndex,
              ),
            );
          },
        );
      } else {
        addMove(
          ctx.moves,
          encodeMove(
            originSquare,
            targetSquare,
            ctx.color,
            PAWN_INDEX,
            MOVE_FLAG.QUIET,
          ),
        );
      }
    }

    // TWO SQUARES
    if (currentRank === pawnConfig.originRank) {
      // bitboardScratch = twoMovesForwardBitboard
      pawnConfig.moveForwardTwoSquaresFn(
        originSquareBitboardLo,
        originSquareBitboardHi,
        bitboardScratch,
      );

      const twoMovesForwardSquareIsEmpty =
        (bitboardScratch.lo & emptySquaresLo) >>> 0 !== 0 ||
        (bitboardScratch.hi & emptySquaresHi) >>> 0 !== 0;

      const twoMovesForwardSquareIsInsideCheckmask =
        (bitboardScratch.lo & attackInfo.checkMaskLo) >>> 0 !== 0 ||
        (bitboardScratch.hi & attackInfo.checkMaskHi) >>> 0 !== 0;

      let isPinPreventingTwoMovesForward: boolean = false;

      if (isPinned) {
        isPinPreventingTwoMovesForward =
          ((bitboardScratch.lo & pinRayFromOriginSquareLo) |
            (bitboardScratch.hi & pinRayFromOriginSquareHi)) >>>
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
        const targetSquare = getSingleBitSquare(
          bitboardScratch.lo,
          bitboardScratch.hi,
        );

        if (targetSquare === undefined) {
          throw new Error("Invalid bitboard");
        }

        addMove(
          ctx.moves,
          encodeMove(
            originSquare,
            targetSquare,
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
    // bitboardScratch = targets
    attacksFn(
      originSquare,
      ctx.allOccupancyLo,
      ctx.allOccupancyHi,
      bitboardScratch,
    );

    if (isPinned) {
      bitboardScratch.lo &= pinRayFromOriginSquareLo;
      bitboardScratch.hi &= pinRayFromOriginSquareHi;
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
      bitboardScratch.lo,
      bitboardScratch.hi,
      originSquare,
      originSquareBitboardLo,
      originSquareBitboardHi,
      enPassantScratch,
    );

    bitboardScratch.lo &= attackInfo.checkMaskLo;
    bitboardScratch.hi &= attackInfo.checkMaskHi;

    bitboardScratch.lo &= ctx.enemyOccupancyLo;
    bitboardScratch.hi &= ctx.enemyOccupancyHi;

    forEachBitGetSquare(
      bitboardScratch.lo,
      bitboardScratch.hi,
      (targetSquare) => {
        const capturedPiece = ctx.pieceAt[targetSquare];

        if (capturedPiece === -1) {
          throw new Error("Invalid captured piece");
        }

        const targetSquareRank = getCurrentRank(targetSquare);

        if (targetSquareRank === pawnConfig.promotionRank) {
          [KNIGHT_INDEX, QUEEN_INDEX, ROOK_INDEX, BISHOP_INDEX].forEach(
            (promotionPieceIndex) => {
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
            },
          );
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
      },
    );
  });
};

export default generatePawnMoves;
