import generateWhitePawnAttacks from "../../attacks/whitePawn";
import { FULL_BOARD_MASK } from "../../constants/mask";
import forEachBitGetSquare from "../../helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../../helpers/getPieceTypeFromStateIndex ";
import { getCurrentRank } from "../../helpers/main";
import { S, SS } from "../../helpers/movement";
import { squareBitboards, squareIndexByBitboard } from "../../lookupTables/importedPrecalculatedData";
import { BISHOP_INDEX, calculatePieceIndex, KNIGHT_INDEX, PAWN_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../state/initialState";
import { MOVE_FLAG, type Move } from "../../types/main";
import type { MoveGenerationContext } from "../types";

const generateBlackPawnMoves = (ctx: MoveGenerationContext): Move[] => {
  const moves: Move[] = [];
  const whitePawns = ctx.state[calculatePieceIndex(ctx.color, PAWN_INDEX)];
  const emptySquares = ~ctx.allOccupancy & FULL_BOARD_MASK;

  forEachBitGetSquare(whitePawns, (originSquare) => {
    /**
     * MOVEMENT
     */
    const originSquareBitboard = squareBitboards[originSquare];
    const currentRank = getCurrentRank(originSquare);
    const oneMoveForwardBitboard = S(originSquareBitboard);

    if ((oneMoveForwardBitboard & ~ctx.allOccupancy) !== 0n) {
      const targetSquare = squareIndexByBitboard.get(oneMoveForwardBitboard);

      if (targetSquare === undefined) {
        throw new Error('Invalid bitboard');
      }

      const targetSquareRank = getCurrentRank(targetSquare);

      // Promotion movement case
      if (targetSquareRank === 0) {
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

    // Can move up two squares
    if (currentRank === 6) {
      const twoMovesForwardBitboard = SS(originSquareBitboard);

      if (((oneMoveForwardBitboard & emptySquares) !== 0n) && ((twoMovesForwardBitboard & emptySquares) !== 0n)) {
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
    const attacks = generateWhitePawnAttacks(originSquare, ctx.allOccupancy);
    const captureTargets = attacks & ctx.enemyOccupancy;

    forEachBitGetSquare(captureTargets, (targetSquare) => {
      const capturedPiece = ctx.pieceAt[targetSquare];

      if (capturedPiece === -1) {
        throw new Error('Invalid captured piece');
      }

      const targetSquareRank = getCurrentRank(targetSquare);

      if (targetSquareRank === 0) {
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

export default generateBlackPawnMoves;