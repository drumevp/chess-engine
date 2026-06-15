import countRelevantBits from "../../helpers/countRelevantBits";
import { AttackInfo } from "../../types/attackInfo";
import { MoveGenerationContext } from "../../types/move";
import getCheckers from "./getCheckers";
import getCheckMask from "./getCheckMask";
import getPins from "./getPins";

export const createAttackInfo = (): AttackInfo => ({
  checkersLo: 0,
  checkersHi: 0,
  checkCount: 0,
  pinnedPiecesLo: 0,
  pinnedPiecesHi: 0,
  pinRaysBySquareLo: new Uint32Array(64),
  pinRaysBySquareHi: new Uint32Array(64),
  checkMaskLo: 0,
  checkMaskHi: 0,
});

const resetAttackInfo = (attackInfo: AttackInfo): void => {
  attackInfo.checkersLo = 0;
  attackInfo.checkersHi = 0;
  attackInfo.checkCount = 0;
  attackInfo.pinnedPiecesLo = 0;
  attackInfo.pinnedPiecesHi = 0;
  attackInfo.checkMaskLo = 0;
  attackInfo.checkMaskHi = 0;
  attackInfo.pinRaysBySquareLo.fill(0);
  attackInfo.pinRaysBySquareHi.fill(0);
};

const generateAttackInfo = (
  ctx: MoveGenerationContext,
  attackInfo?: AttackInfo,
): AttackInfo => {
  const result = attackInfo ?? createAttackInfo();

  if (attackInfo !== undefined) {
    resetAttackInfo(result);
  }

  getCheckers(ctx, result);
  getPins(ctx, result);

  result.checkCount = countRelevantBits(result.checkersLo, result.checkersHi);
  getCheckMask(ctx.ownKingSquare, result);

  return result;
};

export default generateAttackInfo;
