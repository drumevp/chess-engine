/**
 * This generates a bitboard with every piece that is currently checking the king
 * We derive this by genearting an attack for each piece type with the king as the base square
 
 * When we perform an AND operation on the position bitboard for that enemy piece (with allOccupancy)
 * we see if the king is checked by any of those pieces
 * 
 * Enemy king excluded, since a king can't check another king
 */

import generateBishopAttacks from "../../attacks/bishop";
import generateBlackPawnAttacks from "../../attacks/blackPawn";
import generateKnightAttacks from "../../attacks/knight";
import generateRookAttacks from "../../attacks/rook";
import generateWhitePawnAttacks from "../../attacks/whitePawn";
import getOppositeColor from "../../helpers/getOppositeColor";
import { BISHOP_INDEX, calculatePieceIndex, KNIGHT_INDEX, PAWN_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../state/initialState";
import { COLOR } from "../../types/main";
import type { MoveGenerationContext } from "../types";

const getCheckers = (ctx: MoveGenerationContext): bigint => {
  const enemyColor = getOppositeColor(ctx.color);
  
  const enemyKnights = ctx.state[calculatePieceIndex(enemyColor, KNIGHT_INDEX)];
  const enemyKnightCheckers = generateKnightAttacks(ctx.ownKingSquare, ctx.allOccupancy) & enemyKnights;

  const enemyRooks = ctx.state[calculatePieceIndex(enemyColor, ROOK_INDEX)];
  const enemyQueens = ctx.state[calculatePieceIndex(enemyColor, QUEEN_INDEX)];

  // To save compute, we include the queen in the rook and bishop calculation. Unecessary to do this separately for queens
  const enemyRookCheckers = generateRookAttacks(ctx.ownKingSquare, ctx.allOccupancy) & (enemyRooks | enemyQueens);

  const enemyBishops = ctx.state[calculatePieceIndex(enemyColor, BISHOP_INDEX)];
  const enemyBishopCheckers = generateBishopAttacks(ctx.ownKingSquare, ctx.allOccupancy) & (enemyBishops | enemyQueens);

  const enemyPawns = ctx.state[calculatePieceIndex(enemyColor, PAWN_INDEX)];
  let pawnAttackFn = ctx.color === COLOR.WHITE ? generateWhitePawnAttacks : generateBlackPawnAttacks;
  const enemyPawnCheckers = pawnAttackFn(ctx.ownKingSquare, ctx.allOccupancy) & enemyPawns;

  return enemyKnightCheckers | enemyRookCheckers | enemyBishopCheckers | enemyPawnCheckers;
}

export default getCheckers;