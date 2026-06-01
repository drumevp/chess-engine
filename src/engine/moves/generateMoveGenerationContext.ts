import { COLOR, type Position } from "../types/main";
import type { MoveGenerationContext } from "./types";

const generateMoveGenerationContext = (position: Position): MoveGenerationContext => {
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
      enPassantSquare: position.enPassantSquare,
      castlingRights: position.castlingRights,
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
    }
  }

  return ctx;
}

export default generateMoveGenerationContext;