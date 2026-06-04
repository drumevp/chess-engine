import { COLOR, type Position } from "../types/main";
import type { MoveGenerationContext } from "./types";

const generateMoveGenerationContext = (position: Position): MoveGenerationContext => {
  let ctx: MoveGenerationContext;
  
  const moves: number[] = [];

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
      enPassantSquare: position.enPassantSquare,
      castlingRights: position.castlingRights,
      moves,
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
      enPassantSquare: position.enPassantSquare,
      castlingRights: position.castlingRights,
      moves,
    }
  }

  return ctx;
}

export default generateMoveGenerationContext;