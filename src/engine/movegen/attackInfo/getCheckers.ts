/**
 * Adds non-slider enemy pieces currently checking the king.
 */

import { COLOR } from "../../constants/color";
import {
  KNIGHT_INDEX,
  NUMBER_OF_PIECE_CATEGORIES,
  PAWN_INDEX,
} from "../../constants/piece";
import getOppositeColor from "../../helpers/getOppositeColor";
import {
  blackPawnAttacksHi,
  blackPawnAttacksLo,
  knightAttacksHi,
  knightAttacksLo,
  whitePawnAttacksHi,
  whitePawnAttacksLo,
} from "../../tables/importTables";
import { AttackInfo } from "../../types/attackInfo";
import { MoveGenerationContext } from "../../types/move";

const getCheckers = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const enemyColor = getOppositeColor(ctx.color);
  const enemyOffset = enemyColor * NUMBER_OF_PIECE_CATEGORIES;
  const enemyKnightsIndex = enemyOffset + KNIGHT_INDEX;

  const enemyKnightCheckersLo =
    knightAttacksLo[ctx.ownKingSquare] & ctx.stateLo[enemyKnightsIndex];
  const enemyKnightCheckersHi =
    knightAttacksHi[ctx.ownKingSquare] & ctx.stateHi[enemyKnightsIndex];

  const enemyPawnsIndex = enemyOffset + PAWN_INDEX;
  const pawnAttacksLo =
    ctx.color === COLOR.WHITE
      ? whitePawnAttacksLo[ctx.ownKingSquare]
      : blackPawnAttacksLo[ctx.ownKingSquare];
  const pawnAttacksHi =
    ctx.color === COLOR.WHITE
      ? whitePawnAttacksHi[ctx.ownKingSquare]
      : blackPawnAttacksHi[ctx.ownKingSquare];
  const enemyPawnCheckersLo = pawnAttacksLo & ctx.stateLo[enemyPawnsIndex];
  const enemyPawnCheckersHi = pawnAttacksHi & ctx.stateHi[enemyPawnsIndex];

  attackInfo.checkersLo = (enemyKnightCheckersLo | enemyPawnCheckersLo) >>> 0;
  attackInfo.checkersHi = (enemyKnightCheckersHi | enemyPawnCheckersHi) >>> 0;
};

export default getCheckers;
