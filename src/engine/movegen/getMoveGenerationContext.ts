import { COLOR } from "../constants/color";
import { MoveGenerationContext, MoveList } from "../types/move";
import { Position } from "../types/position";

const getMoveGenerationContext = (
  position: Position,
  moveList: MoveList,
): MoveGenerationContext => {
  let ctx: MoveGenerationContext;

  if (position.color === COLOR.WHITE) {
    ctx = {
      stateLo: position.stateLo,
      stateHi: position.stateHi,
      allOccupancyLo: position.allOccupancyLo,
      allOccupancyHi: position.allOccupancyHi,
      ownOccupancyLo: position.whiteOccupancyLo,
      ownOccupancyHi: position.whiteOccupancyHi,
      enemyOccupancyLo: position.blackOccupancyLo,
      enemyOccupancyHi: position.blackOccupancyHi,
      color: position.color,
      ownKingSquare: position.kingSquares[COLOR.WHITE],
      enemyKingSquare: position.kingSquares[COLOR.BLACK],
      pieceAt: position.pieceAt,
      enPassantSquare: position.enPassantSquare,
      castlingRights: position.castlingRights,
      moves: moveList,
    };
  } else {
    ctx = {
      stateLo: position.stateLo,
      stateHi: position.stateHi,
      allOccupancyLo: position.allOccupancyLo,
      allOccupancyHi: position.allOccupancyHi,
      ownOccupancyLo: position.blackOccupancyLo,
      ownOccupancyHi: position.blackOccupancyHi,
      enemyOccupancyLo: position.whiteOccupancyLo,
      enemyOccupancyHi: position.whiteOccupancyHi,
      color: position.color,
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

export default getMoveGenerationContext;
