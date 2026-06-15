import { COLOR } from "../../constants/color";
import { MOVE_FLAG } from "../../constants/move";
import {
  BISHOP_INDEX,
  KNIGHT_INDEX,
  NUMBER_OF_PIECE_CATEGORIES,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../constants/piece";
import { AttackInfo } from "../../types/attackInfo";
import { Bitboard32 } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";
import { ENCODE_MOVE_NO_PIECE } from "../../position/moves/packedMove";
import {
  blackPawnAttacksHi,
  blackPawnAttacksLo,
  squareBitboardsHi,
  squareBitboardsLo,
  whitePawnAttacksHi,
  whitePawnAttacksLo,
} from "../../tables/importTables";
import generateEnPassantMove from "./generateEnPassantMove";

const enPassantScratch: Bitboard32 = { lo: 0, hi: 0 };
const NO_PIECE_ENCODED =
  (ENCODE_MOVE_NO_PIECE << 16) | (ENCODE_MOVE_NO_PIECE << 19);
const PAWN_BITS = PAWN_INDEX << 13;
const PROMOTION_PIECES = [
  KNIGHT_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
  BISHOP_INDEX,
];

const generatePawnMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const color = ctx.color;
  const pawnsIndex = color * NUMBER_OF_PIECE_CATEGORIES + PAWN_INDEX;
  const pawnsLo = ctx.stateLo[pawnsIndex];
  const pawnsHi = ctx.stateHi[pawnsIndex];
  const singlePushOffset = color === COLOR.WHITE ? 8 : -8;
  const doublePushOffset = color === COLOR.WHITE ? 16 : -16;
  const originRank = color === COLOR.WHITE ? 1 : 6;
  const promotionRank = color === COLOR.WHITE ? 7 : 0;
  const pawnAttacksLo =
    color === COLOR.WHITE ? whitePawnAttacksLo : blackPawnAttacksLo;
  const pawnAttacksHi =
    color === COLOR.WHITE ? whitePawnAttacksHi : blackPawnAttacksHi;
  const colorAndPawnBits = (color << 12) | PAWN_BITS;
  const quietMoveBits = colorAndPawnBits | NO_PIECE_ENCODED;
  const doublePushMoveBits =
    quietMoveBits | (MOVE_FLAG.DOUBLE_PAWN_PUSH << 22);
  const captureMoveBits =
    colorAndPawnBits |
    (ENCODE_MOVE_NO_PIECE << 19) |
    (MOVE_FLAG.CAPTURE << 22);
  const promotionMoveBits =
    colorAndPawnBits |
    (ENCODE_MOVE_NO_PIECE << 16) |
    (MOVE_FLAG.PROMOTION << 22);
  const promotionCaptureMoveBits =
    colorAndPawnBits | (MOVE_FLAG.PROMOTION_CAPTURE << 22);
  const hasEnPassant = ctx.enPassantSquare !== null;
  const moveList = ctx.moves;
  const moves = moveList.moves;
  let moveCount = moveList.count;
  let pawnBits = pawnsLo;
  let squareOffset = 0;

  while (true) {
    while (pawnBits !== 0) {
      const originLsb = pawnBits & -pawnBits;
      const originSquare = squareOffset + 31 - Math.clz32(originLsb);
      const originSquareBitboardLo = squareBitboardsLo[originSquare];
      const originSquareBitboardHi = squareBitboardsHi[originSquare];
      const currentRank = originSquare >> 3;
      const oneMoveForwardSquare = originSquare + singlePushOffset;
      const oneMoveForwardLo = squareBitboardsLo[oneMoveForwardSquare];
      const oneMoveForwardHi = squareBitboardsHi[oneMoveForwardSquare];

      const oneMoveForwardSquareIsEmpty =
        ((oneMoveForwardLo & ctx.allOccupancyLo) |
          (oneMoveForwardHi & ctx.allOccupancyHi)) ===
        0;

      const isPinned =
        ((attackInfo.pinnedPiecesLo & originSquareBitboardLo) |
          (attackInfo.pinnedPiecesHi & originSquareBitboardHi)) !==
        0;

      let isPinPreventingOneMoveForward = false;
      let pinRayFromOriginSquareLo = 0;
      let pinRayFromOriginSquareHi = 0;

      if (isPinned) {
        pinRayFromOriginSquareLo = attackInfo.pinRaysBySquareLo[originSquare];
        pinRayFromOriginSquareHi = attackInfo.pinRaysBySquareHi[originSquare];
        isPinPreventingOneMoveForward =
          ((oneMoveForwardLo & pinRayFromOriginSquareLo) |
            (oneMoveForwardHi & pinRayFromOriginSquareHi)) ===
          0;
      }

      if (
        oneMoveForwardSquareIsEmpty &&
        !isPinPreventingOneMoveForward &&
        ((oneMoveForwardLo & attackInfo.checkMaskLo) |
          (oneMoveForwardHi & attackInfo.checkMaskHi)) !==
          0
      ) {
        if ((oneMoveForwardSquare >> 3) === promotionRank) {
          for (let i = 0; i < PROMOTION_PIECES.length; i++) {
            moves[moveCount++] =
              originSquare |
              (oneMoveForwardSquare << 6) |
              promotionMoveBits |
              (PROMOTION_PIECES[i] << 19);
          }
        } else {
          moves[moveCount++] =
            originSquare | (oneMoveForwardSquare << 6) | quietMoveBits;
        }
      }

      if (
        currentRank === originRank &&
        oneMoveForwardSquareIsEmpty &&
        !isPinPreventingOneMoveForward
      ) {
        const twoMovesForwardSquare = originSquare + doublePushOffset;
        const twoMovesForwardLo = squareBitboardsLo[twoMovesForwardSquare];
        const twoMovesForwardHi = squareBitboardsHi[twoMovesForwardSquare];

        const twoMovesForwardSquareIsEmpty =
          ((twoMovesForwardLo & ctx.allOccupancyLo) |
            (twoMovesForwardHi & ctx.allOccupancyHi)) ===
          0;

        const twoMovesForwardSquareIsInsideCheckmask =
          ((twoMovesForwardLo & attackInfo.checkMaskLo) |
            (twoMovesForwardHi & attackInfo.checkMaskHi)) !==
          0;

        let isPinPreventingTwoMovesForward = false;

        if (isPinned) {
          isPinPreventingTwoMovesForward =
            ((twoMovesForwardLo & pinRayFromOriginSquareLo) |
              (twoMovesForwardHi & pinRayFromOriginSquareHi)) ===
            0;
        }

        if (
          twoMovesForwardSquareIsEmpty &&
          twoMovesForwardSquareIsInsideCheckmask &&
          !isPinPreventingTwoMovesForward
        ) {
          moves[moveCount++] =
            originSquare | (twoMovesForwardSquare << 6) | doublePushMoveBits;
        }
      }

      let targetsLo = pawnAttacksLo[originSquare];
      let targetsHi = pawnAttacksHi[originSquare];

      if (isPinned) {
        targetsLo &= pinRayFromOriginSquareLo;
        targetsHi &= pinRayFromOriginSquareHi;
      }

      if (hasEnPassant) {
        moveList.count = moveCount;
        generateEnPassantMove(
          ctx,
          attackInfo.checkMaskLo,
          attackInfo.checkMaskHi,
          attackInfo.checkersLo,
          attackInfo.checkersHi,
          attackInfo.checkCount,
          targetsLo,
          targetsHi,
          originSquare,
          originSquareBitboardLo,
          originSquareBitboardHi,
          enPassantScratch,
        );
        moveCount = moveList.count;
      }

      let captureTargets =
        targetsLo & attackInfo.checkMaskLo & ctx.enemyOccupancyLo;
      while (captureTargets !== 0) {
        const targetLsb = captureTargets & -captureTargets;
        const targetSquare = 31 - Math.clz32(targetLsb);
        const capturedPiece = ctx.pieceAt[targetSquare];
        const capturedPieceType =
          capturedPiece >= NUMBER_OF_PIECE_CATEGORIES
            ? capturedPiece - NUMBER_OF_PIECE_CATEGORIES
            : capturedPiece;

        if ((targetSquare >> 3) === promotionRank) {
          for (let i = 0; i < PROMOTION_PIECES.length; i++) {
            moves[moveCount++] =
              originSquare |
              (targetSquare << 6) |
              promotionCaptureMoveBits |
              (capturedPieceType << 16) |
              (PROMOTION_PIECES[i] << 19);
          }
        } else {
          moves[moveCount++] =
            originSquare |
            (targetSquare << 6) |
            captureMoveBits |
            (capturedPieceType << 16);
        }

        captureTargets = (captureTargets & (captureTargets - 1)) >>> 0;
      }

      captureTargets = targetsHi & attackInfo.checkMaskHi & ctx.enemyOccupancyHi;
      while (captureTargets !== 0) {
        const targetLsb = captureTargets & -captureTargets;
        const targetSquare = 63 - Math.clz32(targetLsb);
        const capturedPiece = ctx.pieceAt[targetSquare];
        const capturedPieceType =
          capturedPiece >= NUMBER_OF_PIECE_CATEGORIES
            ? capturedPiece - NUMBER_OF_PIECE_CATEGORIES
            : capturedPiece;

        if ((targetSquare >> 3) === promotionRank) {
          for (let i = 0; i < PROMOTION_PIECES.length; i++) {
            moves[moveCount++] =
              originSquare |
              (targetSquare << 6) |
              promotionCaptureMoveBits |
              (capturedPieceType << 16) |
              (PROMOTION_PIECES[i] << 19);
          }
        } else {
          moves[moveCount++] =
            originSquare |
            (targetSquare << 6) |
            captureMoveBits |
            (capturedPieceType << 16);
        }

        captureTargets = (captureTargets & (captureTargets - 1)) >>> 0;
      }

      pawnBits = (pawnBits & (pawnBits - 1)) >>> 0;
    }

    if (squareOffset !== 0) {
      break;
    }

    pawnBits = pawnsHi;
    squareOffset = 32;
  }

  moveList.count = moveCount;
};

export default generatePawnMoves;
