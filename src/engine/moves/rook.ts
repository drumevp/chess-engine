import generateRookAttacks from "../attacks/rook";
import {  ROOK_INDEX } from "../state/initialState";
import type { AttackInfo } from "./attackInfo/types";
import generateMove from "./generateMove";
import type { MoveGenerationContext } from "./types";

const generateRookMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, ROOK_INDEX, generateRookAttacks);
}

export default generateRookMoves;