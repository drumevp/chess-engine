export { kingAttacks } from "../../../precalculatedData/kingAttacks";
export { knightAttacks } from "../../../precalculatedData/knightAttacks";
export { whitePawnAttacks } from "../../../precalculatedData/whitePawnAttacks";
export { blackPawnAttacks } from "../../../precalculatedData/blackPawnAttacks";

export { rookRelevantBlockerMasks } from "../../../precalculatedData/rookRelevantBlockerMasks";
export { rookShifts } from "../../../precalculatedData/rookShifts";
export { rookMagicNumbers } from "../../../precalculatedData/rookMagicNumbers";
export { rookMagicAttacks } from "../../../precalculatedData/rookMagicAttacks";

export { bishopRelevantBlockerMasks } from "../../../precalculatedData/bishopRelevantBlockerMasks";
export { bishopShifts } from "../../../precalculatedData/bishopShifts";
export { bishopMagicNumbers } from "../../../precalculatedData/bishopMagicNumbers";
export { bishopMagicAttacks } from "../../../precalculatedData/bishopMagicAttacks";

import { squareBitboards } from "../../../precalculatedData/squareBitboards";

export { squareBitboards };

// inverted squareBitboards
export const squareIndexByBitboard = new Map<bigint, number>();

for (let i = 0; i < 64; i++) {
  squareIndexByBitboard.set(squareBitboards[i], i);
}