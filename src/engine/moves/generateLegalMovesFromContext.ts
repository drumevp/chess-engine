import { AttackInfo } from "./attackInfo/types";
import generateBishopMoves from "./bishop";
import generateKingMoves from "./king/king";
import generateKnightMoves from "./knight";
import generatePawnMoves from "./pawn/pawn";
import generateQueenMoves from "./queen";
import generateRookMoves from "./rook";
import { MoveGenerationContext } from "./types";

const generateLegalMovesFromContext = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): number => {
  ctx.moves.count = 0;

  generateKingMoves(ctx, attackInfo);

  if (attackInfo.checkCount >= 2) {
    return ctx.moves.count;
  }

  generateKnightMoves(ctx, attackInfo);
  generatePawnMoves(ctx, attackInfo);
  generateRookMoves(ctx, attackInfo);
  generateBishopMoves(ctx, attackInfo);
  generateQueenMoves(ctx, attackInfo);

  return ctx.moves.count;
};

export default generateLegalMovesFromContext;
