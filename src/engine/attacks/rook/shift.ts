/**
 * Shift = 64 (squares on board) - relevant bit squares from the relevant blocker mask
 * Example for a1 (index 0). Shift = 64 - 12 = 52
 */

import { countRelevantBits } from "../../helpers/main";
import { rookRelevantBlockerMask } from "./relevantBlockerMask";

export const rookShift: number[] = [];

rookRelevantBlockerMask.forEach((bitboard, i) => {
  const relevantBitCount = countRelevantBits(bitboard);

  rookShift[i] = 64 - relevantBitCount;
});
