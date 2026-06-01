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
import { FULL_BOARD_MASK } from "../../constants/mask";
import forEachBitGetSquare from "../../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../../helpers/getPieceTypeFromStateIndex ";
import { getCurrentRank } from "../../helpers/main";
import { squareBitboards, squareIndexByBitboard } from "../../lookupTables/importedPrecalculatedData";
import { BISHOP_INDEX, calculatePieceIndex, KNIGHT_INDEX, PAWN_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../state/initialState";
import { COLOR, MOVE_FLAG, type Move } from "../../types/main";
import type { AttackInfo } from "../attackInfo/types";
import type { MoveGenerationContext } from "../types";
import generateEnPessantMove from "./generateEnPessantMove";
import { PAWN_CONFIG } from "./pawnConfig";

const generatePawnMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): Move[] => {
  const moves: Move[] = [];
  const pawns = ctx.state[calculatePieceIndex(ctx.color, PAWN_INDEX)];
  const pawnConfig = PAWN_CONFIG[ctx.color];
  const emptySquares = ~ctx.allOccupancy & FULL_BOARD_MASK;

  forEachBitGetSquare(pawns, (originSquare) => {
    /**
     * MOVEMENT
     */
    const originSquareBitboard = squareBitboards[originSquare];
    const currentRank = getCurrentRank(originSquare);
    const oneMoveForwardBitboard = pawnConfig.moveForwardOneSquareFn(originSquareBitboard);
    const oneMoveForwardSquareIsEmpty = (oneMoveForwardBitboard & emptySquares) !== 0n;
    const oneMoveForwardSquareIsInsideCheckmask = oneMoveForwardBitboard & attackInfo.checkMask;

    const isPinned = (attackInfo.pinnedPieces & originSquareBitboard) !== 0n;
    const pinRayFromOriginSquare = attackInfo.pinRaysBySquare[originSquare];

    let isPinPreventingOneMoveForward: boolean = false;
    
    if (isPinned) {
      isPinPreventingOneMoveForward = (oneMoveForwardBitboard & pinRayFromOriginSquare) === 0n; 
    }

    // ONE SQUARE
    if (oneMoveForwardSquareIsEmpty && oneMoveForwardSquareIsInsideCheckmask && !isPinPreventingOneMoveForward) {
      const targetSquare = squareIndexByBitboard.get(oneMoveForwardBitboard);

      if (targetSquare === undefined) {
        throw new Error('Invalid bitboard');
      }

      const targetSquareRank = getCurrentRank(targetSquare);

      // Promotion movement case
      if (targetSquareRank === pawnConfig.promotionRank) {
        [KNIGHT_INDEX, QUEEN_INDEX, ROOK_INDEX, BISHOP_INDEX].forEach((promotionPieceIndex) => {
          moves.push({
            color: ctx.color,
            flag: MOVE_FLAG.PROMOTION,
            from: originSquare,
            to: targetSquare,
            piece: PAWN_INDEX,
            promotionPiece: promotionPieceIndex,
          })
        });
      } else {
        moves.push({
        color: ctx.color,
        flag: MOVE_FLAG.QUIET,
        from: originSquare,
        to: targetSquare,
        piece: PAWN_INDEX,
      });
      }

      
    }

    // TWO SQUARES
    if (currentRank === pawnConfig.originRank) {
      const twoMovesForwardBitboard = pawnConfig.moveForwardTwoSquaresFn(originSquareBitboard);
      const twoMovesForwardSquareIsEmpty = (twoMovesForwardBitboard & emptySquares) !== 0n;
      const twoMovesForwardSquareIsInsideCheckmask = twoMovesForwardBitboard & attackInfo.checkMask;

      let isPinPreventingTwoMovesForward: boolean = false;
      
      if (isPinned) {
        isPinPreventingTwoMovesForward = (twoMovesForwardBitboard & pinRayFromOriginSquare) === 0n;
      }

      if (oneMoveForwardSquareIsEmpty && twoMovesForwardSquareIsEmpty && twoMovesForwardSquareIsInsideCheckmask && !isPinPreventingOneMoveForward && !isPinPreventingTwoMovesForward) {
        const targetSquare = squareIndexByBitboard.get(twoMovesForwardBitboard);

        if (targetSquare === undefined) {
          throw new Error('Invalid bitboard');
        }

        moves.push({
          color: ctx.color,
          flag: MOVE_FLAG.DOUBLE_PAWN_PUSH,
          from: originSquare,
          to: targetSquare,
          piece: PAWN_INDEX,
        });
      }
    }

    /**
     * ATTACKS
     */
    const attacksFn = ctx.color === COLOR.WHITE ? generateWhitePawnAttacks : generateBlackPawnAttacks;
    let targets = attacksFn(originSquare, ctx.allOccupancy);
    

    
    if (isPinned) {
      targets = targets & pinRayFromOriginSquare;
    }
    
    /** 
     * En Pessant logic
     */
    const enPessantMove = generateEnPessantMove(ctx, attackInfo.checkMask, attackInfo.checkers, attackInfo.checkCount, targets, originSquare);

    if (enPessantMove !== null) {
      moves.push(enPessantMove);
    }
    
    targets = targets & attackInfo.checkMask;
    targets = targets & ctx.enemyOccupancy;

    forEachBitGetSquare(targets, (targetSquare) => {
      const capturedPiece = ctx.pieceAt[targetSquare];

      if (capturedPiece === -1) {
        throw new Error('Invalid captured piece');
      }

      const targetSquareRank = getCurrentRank(targetSquare);

      if (targetSquareRank === pawnConfig.promotionRank) {

        [KNIGHT_INDEX, QUEEN_INDEX, ROOK_INDEX, BISHOP_INDEX].forEach((promotionPieceIndex) => {
          moves.push({
            color: ctx.color,
            flag: MOVE_FLAG.PROMOTION_CAPTURE,
            from: originSquare,
            to: targetSquare,
            piece: PAWN_INDEX,
            promotionPiece: promotionPieceIndex,
            capturedPiece: getPieceTypeFromStateIndex(capturedPiece),
          });
        });
      } else {
        moves.push({
          color: ctx.color,
            flag: MOVE_FLAG.CAPTURE,
            from: originSquare,
            to: targetSquare,
            piece: PAWN_INDEX,
            capturedPiece: getPieceTypeFromStateIndex(capturedPiece),
        });
      }
    });
  });

  return moves;
}

export default generatePawnMoves;