import { ColorType } from "./color";
import { GameEndReason, GameState } from "./gameState";
import { Move } from "./move";

export type AnalyzePosition = {
  encodedLegalMoves: Uint32Array;
  legalMoves: Move[];
  legalMovesCount: number;
  sideToMove: ColorType;
  isCheck: boolean;
  gameState: GameState;
  gameEndReason: GameEndReason | null;
};
