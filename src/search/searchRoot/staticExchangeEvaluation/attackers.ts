import generateBishopAttacks from "../../../engine/attacks/bishop";
import generateQueenAttacks from "../../../engine/attacks/queen";
import generateRookAttacks from "../../../engine/attacks/rook";
import { COLOR } from "../../../engine/constants/color";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  ROOK_INDEX,
} from "../../../engine/constants/piece";
import calculatePieceIndex from "../../../engine/helpers/calculatePieceIndex";
import getSingleBitSquare from "../../../engine/helpers/getSingleBitSquare";
import {
  blackPawnAttacksHi,
  blackPawnAttacksLo,
  kingAttacksHi,
  kingAttacksLo,
  knightAttacksHi,
  knightAttacksLo,
  whitePawnAttacksHi,
  whitePawnAttacksLo,
} from "../../../engine/tables/importTables";
import { ColorType } from "../../../engine/types/color";
import { ATTACKER_ORDER } from "../../constants/staticExchangeEvaluation";
import { StaticExchangeEvaluationScratch } from "../../types/staticExchangeEvaluation";

const setAttackerBitboard = (
  scratch: StaticExchangeEvaluationScratch,
  targetSquare: number,
  attackingColor: ColorType,
  piece: number,
): void => {
  const stateIndex = calculatePieceIndex(attackingColor, piece);

  if (piece === PAWN_INDEX) {
    const attacksLo =
      attackingColor === COLOR.WHITE
        ? blackPawnAttacksLo[targetSquare]
        : whitePawnAttacksLo[targetSquare];
    const attacksHi =
      attackingColor === COLOR.WHITE
        ? blackPawnAttacksHi[targetSquare]
        : whitePawnAttacksHi[targetSquare];

    scratch.attackersLo = (attacksLo & scratch.stateLo[stateIndex]) >>> 0;
    scratch.attackersHi = (attacksHi & scratch.stateHi[stateIndex]) >>> 0;

    return;
  }

  if (piece === KNIGHT_INDEX) {
    scratch.attackersLo =
      (knightAttacksLo[targetSquare] & scratch.stateLo[stateIndex]) >>> 0;
    scratch.attackersHi =
      (knightAttacksHi[targetSquare] & scratch.stateHi[stateIndex]) >>> 0;

    return;
  }

  if (piece === KING_INDEX) {
    scratch.attackersLo =
      (kingAttacksLo[targetSquare] & scratch.stateLo[stateIndex]) >>> 0;
    scratch.attackersHi =
      (kingAttacksHi[targetSquare] & scratch.stateHi[stateIndex]) >>> 0;

    return;
  }

  if (piece === BISHOP_INDEX) {
    generateBishopAttacks(
      targetSquare,
      scratch.simulatedAllOccupancyLo,
      scratch.simulatedAllOccupancyHi,
      scratch.attackScratch,
    );
  } else if (piece === ROOK_INDEX) {
    generateRookAttacks(
      targetSquare,
      scratch.simulatedAllOccupancyLo,
      scratch.simulatedAllOccupancyHi,
      scratch.attackScratch,
    );
  } else {
    generateQueenAttacks(
      targetSquare,
      scratch.simulatedAllOccupancyLo,
      scratch.simulatedAllOccupancyHi,
      scratch.attackScratch,
    );
  }

  scratch.attackersLo =
    (scratch.attackScratch.lo & scratch.stateLo[stateIndex]) >>> 0;
  scratch.attackersHi =
    (scratch.attackScratch.hi & scratch.stateHi[stateIndex]) >>> 0;
};

export const findLeastValuableAttacker = (
  scratch: StaticExchangeEvaluationScratch,
  targetSquare: number,
  attackingColor: ColorType,
): boolean => {
  for (let i = 0; i < ATTACKER_ORDER.length; i++) {
    const piece = ATTACKER_ORDER[i];

    setAttackerBitboard(scratch, targetSquare, attackingColor, piece);

    if ((scratch.attackersLo | scratch.attackersHi) !== 0) {
      scratch.attackerPiece = piece;
      scratch.attackerSquare = getSingleBitSquare(
        scratch.attackersLo,
        scratch.attackersHi,
      );
      scratch.attackerStateIndex = calculatePieceIndex(attackingColor, piece);

      return true;
    }
  }

  scratch.attackerPiece = -1;
  scratch.attackerSquare = -1;
  scratch.attackerStateIndex = -1;

  return false;
};
