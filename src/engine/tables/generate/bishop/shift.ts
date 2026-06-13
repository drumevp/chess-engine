import countRelevantBits from "../../../helpers/countRelevantBits";
import { bishopRelevantBlockerMask } from "./relevantBlockerMask";

export const bishopShift: Uint8Array = new Uint8Array(64);

bishopRelevantBlockerMask.forEach((bitboard, i) => {
  const relevantBitCount = countRelevantBits(bitboard);

  bishopShift[i] = 64 - relevantBitCount;
});
