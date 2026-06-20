import type { Undo } from "../../engine/types/history";
import type { Position } from "../../engine/types/position";
import type { SearchEvaluator } from "../types/nnue";
import simpleEval from "./simpleEval";

export const SIMPLE_EVALUATOR: SearchEvaluator = {
  evaluate: simpleEval,
};

export const evaluatePosition = (
  evaluator: SearchEvaluator,
  position: Position,
): number => evaluator.evaluate(position);

export const resetEvaluator = (
  evaluator: SearchEvaluator,
  position: Position,
): void => {
  evaluator.reset?.(position);
};

export const pushEvaluatorMove = (
  evaluator: SearchEvaluator,
  position: Position,
  move: number,
  undo: Undo,
): void => {
  evaluator.pushMove?.(position, move, undo);
};

export const popEvaluatorMove = (evaluator: SearchEvaluator): void => {
  evaluator.popMove?.();
};
