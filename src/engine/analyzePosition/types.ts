import { ColorType, Move } from "../types/main";

export type AnalyzePosition = {
  legalMoves: Move[];
  legalMovesCount: number;
  sideToMove: ColorType;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
};
