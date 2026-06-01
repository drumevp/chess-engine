import generateKnightAttacks from "../attacks/knight";
import { KNIGHT_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import type { AttackInfo } from "./attackInfo/types";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateKnightMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): Move[] => {
  return generateMove(ctx, attackInfo, KNIGHT_INDEX, generateKnightAttacks);
}

export default generateKnightMoves;