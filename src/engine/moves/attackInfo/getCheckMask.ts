/**
 * This generates a bitboard with all valid squares a piece can go to to resolve a check.
 * IF checkCount is 0 (no check), all squares are valid.
 * IF checkCount is 2 (cant really be higher than 2), no piece can block it. The king must move.
 * IF checkCount is 1, we create a ray between the king and the checking piece square (including the chekcing piece square). Those are
 * all the legal squares a piece must go to to resolve the check
 */

import { FULL_BOARD_MASK } from "../../constants/mask";
import { betweenSquares, squareIndexByBitboard } from "../../lookupTables/importedPrecalculatedData";

const getCheckMask = (ownKingSquare: number, checkers: bigint, checkCount: number) => {
  if (checkCount < 0) {
    throw new Error('Invalid check count');
  }

  if (checkCount === 0) {
    return FULL_BOARD_MASK;
  }

  if (checkCount >= 2) {
    return 0n;
  }

  const checkerSquare = squareIndexByBitboard.get(checkers);

  if (checkerSquare === undefined) {
    throw new Error('Invalid checker square');
  }

  return betweenSquares[ownKingSquare][checkerSquare] | checkers;
}

export default getCheckMask;