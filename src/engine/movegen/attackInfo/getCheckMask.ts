/**
 * This generates a bitboard with all valid squares a piece can go to to resolve a check.
 * IF checkCount is 0 (no check), all squares are valid.
 * IF checkCount is 2 (cant really be higher than 2), no piece can block it. The king must move.
 * IF checkCount is 1, we create a ray between the king and the checking piece square (including the chekcing piece square). Those are
 * all the legal squares a piece must go to to resolve the check
 */

import { LOWER_32_BITS_MASK } from "../../constants/mask";
import getSingleBitSquare from "../../helpers/getSingleBitSquare";
import { betweenSquaresHi, betweenSquaresLo } from "../../tables/importTables";
import { AttackInfo } from "../../types/attackInfo";

const getCheckMask = (
  ownKingSquare: number,
  attackInfo: AttackInfo,
) => {
  if (attackInfo.checkCount < 0) {
    throw new Error("Invalid check count");
  }

  if (attackInfo.checkCount === 0) {
    attackInfo.checkMaskLo = LOWER_32_BITS_MASK;
    attackInfo.checkMaskHi = LOWER_32_BITS_MASK;

    return;
  }

  if (attackInfo.checkCount >= 2) {
    attackInfo.checkMaskLo = 0;
    attackInfo.checkMaskHi = 0;

    return;
  }

  const checkerSquare = getSingleBitSquare(
    attackInfo.checkersLo,
    attackInfo.checkersHi,
  );

  if (checkerSquare === undefined) {
    throw new Error("Invalid checker square");
  }

  const index = ownKingSquare * 64 + checkerSquare;

  attackInfo.checkMaskLo =
    (betweenSquaresLo[index] | attackInfo.checkersLo) >>> 0;
  attackInfo.checkMaskHi =
    (betweenSquaresHi[index] | attackInfo.checkersHi) >>> 0;
};

export default getCheckMask;
