/**
 * This removes a piece at a square from:
 * state[pieceIndex]
 * whiteOccupancy
 * blackOccupancy
 * allOccupancy
 * pieceAt
 */

import { FULL_BOARD_MASK } from "../../constants/mask";
import { squareBitboards } from "../../lookupTables/importedPrecalculatedData";
import type { Position } from "../../types/main";

const clearSquare = (position: Position, square: number): void => {
  const pieceStateIndex = position.pieceAt[square];

  if (pieceStateIndex === -1) {
    throw new Error(`No piece of square ${square}`);
  }

  const bit = squareBitboards[square];

  position.state[pieceStateIndex] &= FULL_BOARD_MASK ^ bit;

  if (pieceStateIndex < 6) {
    position.whiteOccupancy = position.whiteOccupancy & (FULL_BOARD_MASK ^ bit);
  } else {
    position.blackOccupancy = position.blackOccupancy & (FULL_BOARD_MASK ^ bit);
  }

  position.allOccupancy = position.allOccupancy & (FULL_BOARD_MASK ^ bit);
  position.pieceAt[square] = -1;
};

export default clearSquare;
