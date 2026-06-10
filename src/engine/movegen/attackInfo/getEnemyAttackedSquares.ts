/**
 * Get all squares that are attacked by enemy pieces. We remove the king from the occupancy bitboard.
 * The reason is to prevent illegal king moves. For example if a rook on A8 is checking a king on A2,
 * we want to  prevent the king from going to A1.
 */

import getAllAttacksForColor from "../../helpers/getAllAttacksForColor";
import getOppositeColor from "../../helpers/getOppositeColor";
import { squareBitboards } from "../../tables/importTables";
import { Bitboard } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";

const getEnemyAttackedSquares = (ctx: MoveGenerationContext): Bitboard => {
  const ownKingBit = squareBitboards[ctx.ownKingSquare];
  const occupancyForEnemyAttacks = ctx.allOccupancy & ~ownKingBit;

  return getAllAttacksForColor(getOppositeColor(ctx.color), ctx.state, occupancyForEnemyAttacks);
}

export default getEnemyAttackedSquares;