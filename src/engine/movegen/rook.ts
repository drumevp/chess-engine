import generateRookAttacks from "../attacks/rook";
import { ROOK_INDEX } from "../constants/piece";
import { AttackInfo } from "../types/attackInfo";
import { MoveGenerationContext } from "../types/move";
import generateMove from "./generateMove";

const generateRookMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  generateMove(ctx, attackInfo, ROOK_INDEX, generateRookAttacks);
}

export default generateRookMoves;