import generateBishopAttacks from "../attacks/bishop";
import { BISHOP_INDEX } from "../constants/piece";
import { AttackInfo } from "../types/attackInfo";
import { MoveGenerationContext } from "../types/move";
import generateMove from "./generateMove";

const generateBishopMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, BISHOP_INDEX, generateBishopAttacks);
}

export default generateBishopMoves;