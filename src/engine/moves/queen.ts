import generateQueenAttacks from "../attacks/queen";
import { QUEEN_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateQueenMoves = (ctx: MoveGenerationContext): Move[] => {
  return generateMove(ctx, QUEEN_INDEX, generateQueenAttacks);
}

export default generateQueenMoves;