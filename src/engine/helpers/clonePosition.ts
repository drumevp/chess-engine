import { Position } from "../types/position";

const clonePosition = (position: Position): Position => ({
  stateLo: new Uint32Array(position.stateLo),
  stateHi: new Uint32Array(position.stateHi),

  allOccupancyLo: position.allOccupancyLo,
  allOccupancyHi: position.allOccupancyHi,
  whiteOccupancyLo: position.whiteOccupancyLo,
  whiteOccupancyHi: position.whiteOccupancyHi,
  blackOccupancyLo: position.blackOccupancyLo,
  blackOccupancyHi: position.blackOccupancyHi,

  color: position.color,
  castlingRights: position.castlingRights,
  enPassantSquare: position.enPassantSquare,
  halfMoveClock: position.halfMoveClock,
  fullMoveNumber: position.fullMoveNumber,

  pieceAt: new Int8Array(position.pieceAt),
  kingSquares: new Int8Array(position.kingSquares),

  zobristHash: position.zobristHash,
});

export default clonePosition;
