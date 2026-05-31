import { COLOR, type Move } from "../../types/main";
import type { MoveGenerationContext } from "../types";
import generateBlackPawnMoves from "./blackPawn";
import generateWhitePawnMoves from "./whitePawn";

const generatePawnMoves = (ctx: MoveGenerationContext): Move[] => {
  if (ctx.color === COLOR.WHITE) {
    return generateWhitePawnMoves(ctx);
  }

  return generateBlackPawnMoves(ctx);
}

export default generatePawnMoves;