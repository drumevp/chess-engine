import { squareBitboards } from "../../lookupTables/importedPrecalculatedData";
import type { Position } from "../../types/main";

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
