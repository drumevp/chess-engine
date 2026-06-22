import { AttackInfo } from "../types/attackInfo";
import { MoveGenerationContext } from "../types/move";
import generateBishopMoves from "./bishop";
import generateKingMoves from "./king/king";
import generateKnightMoves from "./knight";
import generatePawnMoves from "./pawn/pawn";
import generateQueenMoves from "./queen";
import generateRookMoves from "./rook";

const generateLegalMovesFromContext = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
  capturesAndPromotionsOnly = false,
): number => {
  ctx.moves.count = 0;

  generateKingMoves(ctx, attackInfo, capturesAndPromotionsOnly);

  if (attackInfo.checkCount >= 2) {
    return ctx.moves.count;
  }

  generateKnightMoves(ctx, attackInfo, capturesAndPromotionsOnly);
  generatePawnMoves(ctx, attackInfo, capturesAndPromotionsOnly);
  generateRookMoves(ctx, attackInfo, capturesAndPromotionsOnly);
  generateBishopMoves(ctx, attackInfo, capturesAndPromotionsOnly);
  generateQueenMoves(ctx, attackInfo, capturesAndPromotionsOnly);

  return ctx.moves.count;
};

export default generateLegalMovesFromContext;
