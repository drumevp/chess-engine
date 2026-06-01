import { type Move, type Position } from "../types/main";
import generateAttackInfo from "./attackInfo/main";
import generateBishopMoves from "./bishop";
import generateMoveGenerationContext from "./generateMoveGenerationContext";
import generateKingMoves from "./king";
import generateKnightMoves from "./knight";
import generatePawnMoves from "./pawn/main";
import generateQueenMoves from "./queen";
import generateRookMoves from "./rook";

const generateLegalMoves = (position: Position): Move[] => {
  const ctx = generateMoveGenerationContext(position);
  const attackInfo = generateAttackInfo(ctx);

  const kingMoves = generateKingMoves(ctx, attackInfo);

  if (attackInfo.checkCount >= 2) {
    return kingMoves;
  }

  
  const knightMoves = generateKnightMoves(ctx, attackInfo);
  const pawnMoves = generatePawnMoves(ctx, attackInfo);
  const rookMoves = generateRookMoves(ctx, attackInfo);
  const bishopMoves = generateBishopMoves(ctx, attackInfo);
  const queenMoves = generateQueenMoves(ctx, attackInfo);

  return kingMoves.concat(knightMoves, pawnMoves, rookMoves, bishopMoves, queenMoves);
}

export default generateLegalMoves;