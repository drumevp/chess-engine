/**
 * Adds non-slider enemy pieces currently checking the king.
 */

import generateBlackPawnAttacks from "../../attacks/blackPawn";
import generateKnightAttacks from "../../attacks/knight";
import generateWhitePawnAttacks from "../../attacks/whitePawn";
import { COLOR } from "../../constants/color";
import { KNIGHT_INDEX, PAWN_INDEX } from "../../constants/piece";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import getOppositeColor from "../../helpers/getOppositeColor";
import { AttackInfo } from "../../types/attackInfo";
import { MoveGenerationContext } from "../../types/move";

const attackScratch = { lo: 0, hi: 0 };

const getCheckers = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  const enemyColor = getOppositeColor(ctx.color);

  const enemyKnightsIndex = calculatePieceIndex(enemyColor, KNIGHT_INDEX);

  generateKnightAttacks(
    ctx.ownKingSquare,
    ctx.allOccupancyLo,
    ctx.allOccupancyHi,
    attackScratch,
  );

  const enemyKnightCheckersLo =
    attackScratch.lo & ctx.stateLo[enemyKnightsIndex];
  const enemyKnightCheckersHi =
    attackScratch.hi & ctx.stateHi[enemyKnightsIndex];

  const enemyPawnsIndex = calculatePieceIndex(enemyColor, PAWN_INDEX);
  const pawnAttackFn =
    ctx.color === COLOR.WHITE
      ? generateWhitePawnAttacks
      : generateBlackPawnAttacks;

  pawnAttackFn(
    ctx.ownKingSquare,
    ctx.allOccupancyLo,
    ctx.allOccupancyHi,
    attackScratch,
  );
  const enemyPawnCheckersLo = attackScratch.lo & ctx.stateLo[enemyPawnsIndex];
  const enemyPawnCheckersHi = attackScratch.hi & ctx.stateHi[enemyPawnsIndex];

  attackInfo.checkersLo = (enemyKnightCheckersLo | enemyPawnCheckersLo) >>> 0;
  attackInfo.checkersHi = (enemyKnightCheckersHi | enemyPawnCheckersHi) >>> 0;
};

export default getCheckers;
