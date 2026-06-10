/**
 * This sets a piece at a square for:
 * state[pieceIndex]
 * whiteOccupancy
 * blackOccupancy
 * allOccupancy
 * pieceAt
 */

import { squareBitboards } from "../../../tables/importTables";
import { Position } from "../../../types/position";

const setSquare = (
  position: Position,
  square: number,
  pieceStateIndex: number,
): void => {
  if (position.pieceAt[square] !== -1) {
    throw new Error(`Square ${square} is not empty`);
  }

  const bit = squareBitboards[square];

  position.state[pieceStateIndex] |= bit;

  if (pieceStateIndex < 6) {
    position.whiteOccupancy = position.whiteOccupancy | bit;
  } else {
    position.blackOccupancy = position.blackOccupancy | bit;
  }

  position.allOccupancy = position.allOccupancy | bit;
  position.pieceAt[square] = pieceStateIndex;
};

export default setSquare;
