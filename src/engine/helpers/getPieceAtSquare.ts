/**
 * Finds the piece sitting on a specific square
 * This requires the current state of the board represented by 12 bitboards for each piece type and color type
 * squareBitboards is a table with a bitboard representing each square on the chess board
 * By through each piece type and color type bitboard & we perform an AND operation on the square bit,
 * we infer what type & color the piece is on that square if the result isnt 0n
 */

import { squareBitboards } from "../lookupTables/importedPrecalculatedData";
import { NUMBER_OF_PIECE_CATEGORIES } from "../state/initialState";
import type { ColorType } from "../types/main";

export type PieceOnSquare = {
  color: ColorType;
  piece: number;
  stateIndex: number;
};

const getPieceAtSquare = (
  state: bigint[],
  square: number
): PieceOnSquare | null => {
  const squareBit = squareBitboards[square];

  for (let stateIndex = 0; stateIndex < state.length; stateIndex++) {
    if ((state[stateIndex] & squareBit) !== 0n) {
      const color = Math.floor(stateIndex / NUMBER_OF_PIECE_CATEGORIES) as ColorType;
      const piece = stateIndex % NUMBER_OF_PIECE_CATEGORIES;

      return {
        color,
        piece,
        stateIndex,
      };
    }
  }

  return null;
};

export default getPieceAtSquare;