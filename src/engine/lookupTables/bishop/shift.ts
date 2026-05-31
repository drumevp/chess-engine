import countRelevantBits from "../../helpers/countRelevantBits";
import { bishopRelevantBlockerMask } from "./relevantBlockerMask";

export const bishopShift: number[] = [];

bishopRelevantBlockerMask.forEach((bitboard, i) => {
  const relevantBitCount = countRelevantBits(bitboard);

  bishopShift[i] = 64 - relevantBitCount;
});
