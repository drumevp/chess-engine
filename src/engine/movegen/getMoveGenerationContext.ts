import { COLOR } from "../constants/color";
import { MoveGenerationContext, MoveList } from "../types/move";
import { Position } from "../types/position";

export const createMoveGenerationContext = (
  moveList: MoveList,
): MoveGenerationContext => ({
  stateLo: new Uint32Array(0),
  stateHi: new Uint32Array(0),
  allOccupancyLo: 0,
  allOccupancyHi: 0,
  ownOccupancyLo: 0,
  ownOccupancyHi: 0,
  enemyOccupancyLo: 0,
  enemyOccupancyHi: 0,
  color: COLOR.WHITE,
  pieceAt: new Int8Array(0),
  ownKingSquare: -1,
  enemyKingSquare: -1,
  enPassantSquare: null,
  castlingRights: 0,
  moves: moveList,
});

const getMoveGenerationContext = (
  position: Position,
  moveList: MoveList,
  ctx: MoveGenerationContext = createMoveGenerationContext(moveList),
): MoveGenerationContext => {
  ctx.stateLo = position.stateLo;
  ctx.stateHi = position.stateHi;
  ctx.allOccupancyLo = position.allOccupancyLo;
  ctx.allOccupancyHi = position.allOccupancyHi;
  ctx.color = position.color;
  ctx.pieceAt = position.pieceAt;
  ctx.enPassantSquare = position.enPassantSquare;
  ctx.castlingRights = position.castlingRights;
  ctx.moves = moveList;

  if (position.color === COLOR.WHITE) {
    ctx.ownOccupancyLo = position.whiteOccupancyLo;
    ctx.ownOccupancyHi = position.whiteOccupancyHi;
    ctx.enemyOccupancyLo = position.blackOccupancyLo;
    ctx.enemyOccupancyHi = position.blackOccupancyHi;
    ctx.ownKingSquare = position.kingSquares[COLOR.WHITE];
    ctx.enemyKingSquare = position.kingSquares[COLOR.BLACK];
  } else {
    ctx.ownOccupancyLo = position.blackOccupancyLo;
    ctx.ownOccupancyHi = position.blackOccupancyHi;
    ctx.enemyOccupancyLo = position.whiteOccupancyLo;
    ctx.enemyOccupancyHi = position.whiteOccupancyHi;
    ctx.ownKingSquare = position.kingSquares[COLOR.BLACK];
    ctx.enemyKingSquare = position.kingSquares[COLOR.WHITE];
  }

  return ctx;
};

export default getMoveGenerationContext;
