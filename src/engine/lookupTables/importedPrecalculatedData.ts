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
import { bishopMagicAttacks as rawBishopMagicAttacks } from "../../../precalculatedData/bishopMagicAttacks";

export const bishopMagicAttacks: bigint[][] = rawBishopMagicAttacks as bigint[][];

export { squareBitboards } from "../../../precalculatedData/squareBitboards";
