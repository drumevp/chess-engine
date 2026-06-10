import generateKnightAttacks from "../attacks/knight";
import { KNIGHT_INDEX } from "../constants/piece";
import { AttackInfo } from "../types/attackInfo";
import { MoveGenerationContext } from "../types/move";
import generateMove from "./generateMove";

const generateKnightMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, KNIGHT_INDEX, generateKnightAttacks);
}

export default generateKnightMoves;