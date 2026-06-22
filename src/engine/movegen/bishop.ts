import calculateMagicIndex from "../bitboard32/calculateMagicIndex";
import { MOVE_FLAG } from "../constants/move";
import { BISHOP_INDEX, NUMBER_OF_PIECE_CATEGORIES } from "../constants/piece";
import { ENCODE_MOVE_NO_PIECE } from "../position/moves/packedMove";
import {
  bishopMagicAttackOffsets,
  bishopMagicAttacksHi,
  bishopMagicAttacksLo,
  bishopMagicNumbersHi,
  bishopMagicNumbersLo,
  bishopRelevantBlockerMasksHi,
  bishopRelevantBlockerMasksLo,
  bishopShifts,
  squareBitboardsHi,
  squareBitboardsLo,
} from "../tables/importTables";
import { AttackInfo } from "../types/attackInfo";
import { MoveGenerationContext } from "../types/move";

const NO_PIECE_ENCODED =
  (ENCODE_MOVE_NO_PIECE << 16) | (ENCODE_MOVE_NO_PIECE << 19);

const generateBishopMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
  capturesAndPromotionsOnly = false,
): void => {
  const emptySquaresLo = ~ctx.allOccupancyLo >>> 0;
  const emptySquaresHi = ~ctx.allOccupancyHi >>> 0;
  const stateIndex = ctx.color * NUMBER_OF_PIECE_CATEGORIES + BISHOP_INDEX;
  const piecesLo = ctx.stateLo[stateIndex];
  const piecesHi = ctx.stateHi[stateIndex];
  const moveList = ctx.moves;
  const moves = moveList.moves;
  let moveCount = moveList.count;
  const colorAndPieceBits = (ctx.color << 12) | (BISHOP_INDEX << 13);
  const quietMoveBits = colorAndPieceBits | NO_PIECE_ENCODED;
  const captureMoveBits =
    colorAndPieceBits |
    (ENCODE_MOVE_NO_PIECE << 19) |
    (MOVE_FLAG.CAPTURE << 22);

  let originBits = piecesLo;
  let squareOffset = 0;

  while (true) {
    while (originBits !== 0) {
      const originLsb = originBits & -originBits;
      const originSquare = squareOffset + 31 - Math.clz32(originLsb);
      const blockersLo =
        ctx.allOccupancyLo & bishopRelevantBlockerMasksLo[originSquare];
      const blockersHi =
        ctx.allOccupancyHi & bishopRelevantBlockerMasksHi[originSquare];
      const magicIndex = calculateMagicIndex(
        blockersLo,
        blockersHi,
        bishopMagicNumbersLo[originSquare],
        bishopMagicNumbersHi[originSquare],
        bishopShifts[originSquare],
      );
      const tableIndex = bishopMagicAttackOffsets[originSquare] + magicIndex;
      const pseudoTargetsLo =
        (bishopMagicAttacksLo[tableIndex] & ~ctx.ownOccupancyLo) >>> 0;
      const pseudoTargetsHi =
        (bishopMagicAttacksHi[tableIndex] & ~ctx.ownOccupancyHi) >>> 0;

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

      let captureTargets = (targetsLo & ctx.enemyOccupancyLo) >>> 0;
      while (captureTargets !== 0) {
        const targetLsb = captureTargets & -captureTargets;
        const captureTargetSquare = 31 - Math.clz32(targetLsb);
        const capturedPiece = ctx.pieceAt[captureTargetSquare];
        moves[moveCount++] =
          originSquare |
          (captureTargetSquare << 6) |
          captureMoveBits |
          ((capturedPiece >= NUMBER_OF_PIECE_CATEGORIES
            ? capturedPiece - NUMBER_OF_PIECE_CATEGORIES
            : capturedPiece) <<
            16);
        captureTargets = (captureTargets & (captureTargets - 1)) >>> 0;
      }

      captureTargets = (targetsHi & ctx.enemyOccupancyHi) >>> 0;
      while (captureTargets !== 0) {
        const targetLsb = captureTargets & -captureTargets;
        const captureTargetSquare = 63 - Math.clz32(targetLsb);
        const capturedPiece = ctx.pieceAt[captureTargetSquare];
        moves[moveCount++] =
          originSquare |
          (captureTargetSquare << 6) |
          captureMoveBits |
          ((capturedPiece >= NUMBER_OF_PIECE_CATEGORIES
            ? capturedPiece - NUMBER_OF_PIECE_CATEGORIES
            : capturedPiece) <<
            16);
        captureTargets = (captureTargets & (captureTargets - 1)) >>> 0;
      }

      let quietTargets = capturesAndPromotionsOnly
        ? 0
        : (targetsLo & emptySquaresLo) >>> 0;
      while (quietTargets !== 0) {
        const targetLsb = quietTargets & -quietTargets;
        const quietTargetSquare = 31 - Math.clz32(targetLsb);
        moves[moveCount++] =
          originSquare | (quietTargetSquare << 6) | quietMoveBits;
        quietTargets = (quietTargets & (quietTargets - 1)) >>> 0;
      }

      quietTargets = capturesAndPromotionsOnly
        ? 0
        : (targetsHi & emptySquaresHi) >>> 0;
      while (quietTargets !== 0) {
        const targetLsb = quietTargets & -quietTargets;
        const quietTargetSquare = 63 - Math.clz32(targetLsb);
        moves[moveCount++] =
          originSquare | (quietTargetSquare << 6) | quietMoveBits;
        quietTargets = (quietTargets & (quietTargets - 1)) >>> 0;
      }

      originBits = (originBits & (originBits - 1)) >>> 0;
    }

    if (squareOffset !== 0) {
      break;
    }

    originBits = piecesHi;
    squareOffset = 32;
  }

  moveList.count = moveCount;
};

export default generateBishopMoves;
