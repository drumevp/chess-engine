import { countRelevantBits } from "../../helpers/main";
import { bishopRelevantBlockerMask } from "./relevantBlockerMask";

export const bishopShift: number[] = [];

bishopRelevantBlockerMask.forEach((bitboard, i) => {
  const relevantBitCount = countRelevantBits(bitboard);

  bishopShift[i] = 64 - relevantBitCount;
});
