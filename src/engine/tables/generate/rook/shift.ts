/**
 * Shift = 64 (squares on board) - relevant bit squares from the relevant blocker mask
 * Example for a1 (index 0). Shift = 64 - 12 = 52
 */

import countRelevantBitsBigint from "../../../helpers/countRelevantBitsBigint";
import { rookRelevantBlockerMask } from "./relevantBlockerMask";

export const rookShift: Uint8Array = new Uint8Array(64);

rookRelevantBlockerMask.forEach((bitboard, i) => {
  const relevantBitCount = countRelevantBitsBigint(bitboard);

  rookShift[i] = 64 - relevantBitCount;
});
