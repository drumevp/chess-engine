import { type Position } from "../types/main";
import generateAttackInfo from "./attackInfo/main";
import generateBishopMoves from "./bishop";
import generateMoveGenerationContext from "./generateMoveGenerationContext";
import generateKingMoves from "./king/king";
import generateKnightMoves from "./knight";
import generatePawnMoves from "./pawn/pawn";
import generateQueenMoves from "./queen";
import generateRookMoves from "./rook";

const generateLegalMoves = (position: Position): number[] => {
  const ctx = generateMoveGenerationContext(position);
  const attackInfo = generateAttackInfo(ctx);

  generateKingMoves(ctx, attackInfo);

  if (attackInfo.checkCount >= 2) {
    return ctx.moves;
  }

  
  generateKnightMoves(ctx, attackInfo);
  generatePawnMoves(ctx, attackInfo);
  generateRookMoves(ctx, attackInfo);
  generateBishopMoves(ctx, attackInfo);
  generateQueenMoves(ctx, attackInfo);

  return ctx.moves;
}

export default generateLegalMoves;