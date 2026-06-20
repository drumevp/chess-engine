/**
 * https://www.chessprogramming.org/Static_Exchange_Evaluation
 */

import { COLOR } from "../../../engine/constants/color";
import { MOVE_FLAG } from "../../../engine/constants/move";
import { PAWN_INDEX } from "../../../engine/constants/piece";
import calculatePieceIndex from "../../../engine/helpers/calculatePieceIndex";
import getOppositeColor from "../../../engine/helpers/getOppositeColor";
import {
  moveDecodeCapturedPiece,
  moveDecodeColor,
  moveDecodeFlag,
  moveDecodeFrom,
  moveDecodePiece,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../../../engine/position/moves/packedMove";
import { ColorType } from "../../../engine/types/color";
import { Position } from "../../../engine/types/position";
import { getPieceValue } from "../../constants/eval";
import { findLeastValuableAttacker } from "./attackers";
import {
  addOccupancy,
  addPiece,
  removeOccupancy,
  removePiece,
} from "./bitboard";
import { StaticExchangeEvaluationScratch } from "../../types/staticExchangeEvaluation";

const getEnPassantCapturedSquare = (
  moveColor: ColorType,
  moveTo: number,
): number => (moveColor === COLOR.WHITE ? moveTo - 8 : moveTo + 8);

const staticExchangeEvaluation = (
  position: Position,
  move: number,
  scratch: StaticExchangeEvaluationScratch,
): number => {
  const moveFlag = moveDecodeFlag(move);
  const moveCapturedPiece = moveDecodeCapturedPiece(move);

  if (
    moveFlag === MOVE_FLAG.KING_CASTLE ||
    moveFlag === MOVE_FLAG.QUEEN_CASTLE
  ) {
    return 0;
  }

  const moveFrom = moveDecodeFrom(move);
  const moveTo = moveDecodeTo(move);
  const moveColor = moveDecodeColor(move);
  const movePiece = moveDecodePiece(move);
  const movePromotionPiece = moveDecodePromotionPiece(move);
  const capturedPiece =
    moveFlag === MOVE_FLAG.EN_PASSANT ? PAWN_INDEX : moveCapturedPiece;
  const promotionGain =
    movePromotionPiece === null
      ? 0
      : getPieceValue(movePromotionPiece) - getPieceValue(PAWN_INDEX);

  scratch.stateLo.set(position.stateLo);
  scratch.stateHi.set(position.stateHi);
  scratch.simulatedAllOccupancyLo = position.allOccupancyLo;
  scratch.simulatedAllOccupancyHi = position.allOccupancyHi;
  let pieceOnTarget = movePromotionPiece ?? movePiece;

  scratch.gain[0] = getPieceValue(capturedPiece) + promotionGain;

  removePiece(scratch, moveFrom, calculatePieceIndex(moveColor, movePiece));
  removeOccupancy(scratch, moveFrom);

  if (capturedPiece !== null) {
    const capturedSquare =
      moveFlag === MOVE_FLAG.EN_PASSANT
        ? getEnPassantCapturedSquare(moveColor, moveTo)
        : moveTo;

    removePiece(
      scratch,
      capturedSquare,
      calculatePieceIndex(getOppositeColor(moveColor), capturedPiece),
    );

    if (moveFlag === MOVE_FLAG.EN_PASSANT) {
      removeOccupancy(scratch, capturedSquare);
    }
  }

  addPiece(scratch, moveTo, calculatePieceIndex(moveColor, pieceOnTarget));
  addOccupancy(scratch, moveTo);

  let attackingColor = getOppositeColor(moveColor);
  let depth = 1;

  while (findLeastValuableAttacker(scratch, moveTo, attackingColor)) {
    scratch.gain[depth] =
      getPieceValue(pieceOnTarget) - scratch.gain[depth - 1];
    pieceOnTarget = scratch.attackerPiece;

    removePiece(scratch, scratch.attackerSquare, scratch.attackerStateIndex);
    removeOccupancy(scratch, scratch.attackerSquare);

    attackingColor = getOppositeColor(attackingColor);
    depth++;
  }

  while (--depth > 0) {
    scratch.gain[depth - 1] = -Math.max(
      -scratch.gain[depth - 1],
      scratch.gain[depth],
    );
  }

  return scratch.gain[0];
};

export default staticExchangeEvaluation;
