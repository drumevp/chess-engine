import generateKnightAttacks from "../attacks/knight";
import { KNIGHT_INDEX } from "../state/initialState";
import type { AttackInfo } from "./attackInfo/types";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateKnightMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, KNIGHT_INDEX, generateKnightAttacks);
}

export default generateKnightMoves;