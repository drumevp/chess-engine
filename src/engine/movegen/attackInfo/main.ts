import countRelevantBits from "../../helpers/countRelevantBits";
import { AttackInfo } from "../../types/attackInfo";
import { MoveGenerationContext } from "../../types/move";
import getCheckers from "./getCheckers";
import getCheckMask from "./getCheckMask";
import generateEnemyAttackedSquaresBitboard from "./getEnemyAttackedSquares";
import getPins from "./getPins";


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