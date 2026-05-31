import { COLOR, type Move, type Position } from "../types/main";
import generateBishopMoves from "./bishop";
import generateKingMoves from "./king";
import generateKnightMoves from "./knight";
import generatePawnMoves from "./pawn/main";
import generateQueenMoves from "./queen";
import generateRookMoves from "./rook";
import type { MoveGenerationContext } from "./types";

const generatePseudoLegalMoves = (position: Position): Move[] => {
  let ctx: MoveGenerationContext;

  if (position.color === COLOR.WHITE) {
    ctx = {
      state: position.state,
      color: position.color,
      ownOccupancy: position.whiteOccupancy,
      enemyOccupancy: position.blackOccupancy,
      allOccupancy: position.allOccupancy,
      ownKingSquare: position.kingSquares[COLOR.WHITE],
      enemyKingSquare: position.kingSquares[COLOR.BLACK],
      pieceAt: position.pieceAt,
    }
  } else {
    ctx = {
      state: position.state,
      color: position.color,
      ownOccupancy: position.blackOccupancy,
      enemyOccupancy: position.whiteOccupancy,
      allOccupancy: position.allOccupancy,
      ownKingSquare: position.kingSquares[COLOR.BLACK],
      enemyKingSquare: position.kingSquares[COLOR.WHITE],
      pieceAt: position.pieceAt,
    }
  }

  const kingMoves = generateKingMoves(ctx);
  const knightMoves = generateKnightMoves(ctx);
  const pawnMoves = generatePawnMoves(ctx);
  const rookMoves = generateRookMoves(ctx);
  const bishopMoves = generateBishopMoves(ctx);
  const queenMoves = generateQueenMoves(ctx);

  return kingMoves.concat(knightMoves, pawnMoves, rookMoves, bishopMoves, queenMoves);
}

export default generatePseudoLegalMoves;