import countRelevantBits from "../../helpers/countRelevantBits";
import type { MoveGenerationContext } from "../types";
import getCheckers from "./getCheckers";
import getCheckMask from "./getCheckMask";
import generateEnemyAttackedSquaresBitboard from "./getEnemyAttackedSquares";
import getPins from "./getPins";
import type { AttackInfo } from "./types";


const generateAttackInfo = (ctx: MoveGenerationContext): AttackInfo  => {
  const enemyAttackedSquares = generateEnemyAttackedSquaresBitboard(ctx);
  const checkers = getCheckers(ctx);
  const checkCount = countRelevantBits(checkers);
  const { pinnedPieces, pinRaysBySquare } = getPins(ctx);
  const checkMask = getCheckMask(ctx.ownKingSquare, checkers, checkCount);


  return {
    enemyAttackedSquares,
    checkers,
    checkCount,
    pinnedPieces,
    pinRaysBySquare,
    checkMask,
  }
}

export default generateAttackInfo;