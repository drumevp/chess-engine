import generateBishopAttacks from "../attacks/bishop";
import { BISHOP_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import type { AttackInfo } from "./attackInfo/types";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateBishopMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): Move[] => {
  return generateMove(ctx, attackInfo, BISHOP_INDEX, generateBishopAttacks);
}

export default generateBishopMoves;