import generateKnightAttacks from "../attacks/knight";
import { KNIGHT_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateKnightMoves = (ctx: MoveGenerationContext): Move[] => {
  return generateMove(ctx, KNIGHT_INDEX, generateKnightAttacks);
}

export default generateKnightMoves;