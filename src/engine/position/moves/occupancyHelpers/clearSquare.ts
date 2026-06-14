/**
 * This removes a piece at a square from:
 * state[pieceIndex]
 * whiteOccupancy
 * blackOccupancy
 * allOccupancy
 * pieceAt
 */

import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../../tables/importTables";
import { Position } from "../../../types/position";

const clearSquare = (position: Position, square: number): void => {
  const pieceStateIndex = position.pieceAt[square];
  const bitLo = squareBitboardsLo[square];
  const bitHi = squareBitboardsHi[square];

  const clearLo = ~bitLo;
  const clearHi = ~bitHi;

  position.stateLo[pieceStateIndex] &= clearLo;
  position.stateHi[pieceStateIndex] &= clearHi;

  if (pieceStateIndex < 6) {
    position.whiteOccupancyLo &= clearLo;
    position.whiteOccupancyHi &= clearHi;
  } else {
    position.blackOccupancyLo &= clearLo;
    position.blackOccupancyHi &= clearHi;
  }

  position.allOccupancyLo &= clearLo;
  position.allOccupancyHi &= clearHi;

  position.pieceAt[square] = -1;
};

export default clearSquare;
