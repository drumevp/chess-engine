import generateRookAttacks from "../attacks/rook";
import {  ROOK_INDEX } from "../state/initialState";
import { type Move } from "../types/main";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateRookMoves = (ctx: MoveGenerationContext): Move[] => {
  return generateMove(ctx, ROOK_INDEX, generateRookAttacks);
}

export default generateRookMoves;