import generateKingAttacks from "../attacks/king";
import { KING_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateKingMoves = (ctx: MoveGenerationContext): Move[] => {
  return generateMove(ctx, KING_INDEX, generateKingAttacks);
}

export default generateKingMoves;