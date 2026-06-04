import { COLOR, type Position } from "../types/main";
import type { MoveList } from "./moveList";
import type { MoveGenerationContext } from "./types";

const generateMoveGenerationContext = (
  position: Position,
  moveList: MoveList,
): MoveGenerationContext => {
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
      moves: moveList,
    };
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
      moves: moveList,
    };
  }

  return ctx;
};

export default generateMoveGenerationContext;
