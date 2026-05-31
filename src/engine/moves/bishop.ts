import generateBishopAttacks from "../attacks/bishop";
import { BISHOP_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateBishopMoves = (ctx: MoveGenerationContext): Move[] => {
  return generateMove(ctx, BISHOP_INDEX, generateBishopAttacks);
}

export default generateBishopMoves;