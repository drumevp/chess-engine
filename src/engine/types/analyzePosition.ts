import { ColorType } from "./color";
import { Move } from "./move";

export type AnalyzePosition = {
  legalMoves: Move[];
  legalMovesCount: number;
  sideToMove: ColorType;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
};
