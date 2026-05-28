/**
 * Rook blocker subset enumeration
 * 
 * For each relevant blocker mask, generate a subset of blockers
 * For example, for a1, we have 2 * (8 - 2) = 12 masked values
 * This means we need to generate a table with 2^12=4096 values
 * This is because we need every possible variation. For example a blocker
 * on a3 and a5 and so on all the way up to all possible blockers
 */

import { rookRelevantBlockerMask } from "./relevantBlockerMask";

rookRelevantBlockerMask.forEach((mask) => {

})
