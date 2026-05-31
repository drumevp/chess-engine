import type { Move } from "../types/main";
import generateBishopMoves from "./bishop";
import generateKingMoves from "./king";
import generateKnightMoves from "./knight";
import generatePawnMoves from "./pawn/main";
import generateQueenMoves from "./queen";
import generateRookMoves from "./rook";
import type { MoveGenerationContext } from "./types";

const generatePseudoLegalMoves = (ctx: MoveGenerationContext): Move[] => {
  const kingMoves = generateKingMoves(ctx);
  const knightMoves = generateKnightMoves(ctx);
  const pawnMoves = generatePawnMoves(ctx);
  const rookMoves = generateRookMoves(ctx);
  const bishopMoves = generateBishopMoves(ctx);
  const queenMoves = generateQueenMoves(ctx);

  return kingMoves.concat(knightMoves, pawnMoves, rookMoves, bishopMoves, queenMoves);
}

export default generatePseudoLegalMoves;