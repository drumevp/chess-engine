import generateQueenAttacks from "../attacks/queen";
import { QUEEN_INDEX } from "../state/initialState";
import type { AttackInfo } from "./attackInfo/types";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateQueenMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, QUEEN_INDEX, generateQueenAttacks);
}

export default generateQueenMoves;