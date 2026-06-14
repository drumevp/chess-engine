/**
 * This sets a piece at a square for:
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

const setSquare = (
  position: Position,
  square: number,
  pieceStateIndex: number,
): void => {
  if (position.pieceAt[square] !== -1) {
    throw new Error(`Square ${square} is not empty`);
  }

  const bitLo = squareBitboardsLo[square];
  const bitHi = squareBitboardsHi[square];

  position.stateLo[pieceStateIndex] |= bitLo;
  position.stateHi[pieceStateIndex] |= bitHi;

  if (pieceStateIndex < 6) {
    position.whiteOccupancyLo |= bitLo;
    position.whiteOccupancyHi |= bitHi;
  } else {
    position.blackOccupancyLo |= bitLo;
    position.blackOccupancyHi |= bitHi;
  }

  position.allOccupancyLo |= bitLo;
  position.allOccupancyHi |= bitHi;

  position.pieceAt[square] = pieceStateIndex;
};

export default setSquare;
