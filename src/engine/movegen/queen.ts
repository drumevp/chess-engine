import generateQueenAttacks from "../attacks/queen";
import { QUEEN_INDEX } from "../constants/piece";
import { AttackInfo } from "../types/attackInfo";
import { MoveGenerationContext } from "../types/move";
import generateMove from "./generateMove";

const generateQueenMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, QUEEN_INDEX, generateQueenAttacks);
}

export default generateQueenMoves;