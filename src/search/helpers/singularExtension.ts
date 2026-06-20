import { TRANSPOSITION_TABLE_BOUND } from "../constants/transpositionTable";
import { CHECKMATE_SCORE } from "../constants/eval";
import {
  SINGULAR_EXTENSION_AMOUNT,
  SINGULAR_EXTENSION_BETA_MARGIN_PER_DEPTH,
  SINGULAR_EXTENSION_MATE_SCORE_BUFFER,
  SINGULAR_EXTENSION_MIN_DEPTH,
  SINGULAR_EXTENSION_SEARCH_DEPTH_DIVISOR,
  SINGULAR_EXTENSION_TT_DEPTH_MARGIN,
} from "../constants/singularExtension";
import type { TranspositionTableEntry } from "../types/transpositionTable";

export const canUseSingularExtension = (
  depth: number,
  isCheck: boolean,
  excludedMove: number | null,
  transpositionTableEntry: TranspositionTableEntry | null,
  move: number,
): boolean => {
  if (
    isCheck ||
    excludedMove !== null ||
    depth < SINGULAR_EXTENSION_MIN_DEPTH ||
    transpositionTableEntry === null ||
    transpositionTableEntry.bestMove !== move ||
    transpositionTableEntry.depth < depth - SINGULAR_EXTENSION_TT_DEPTH_MARGIN
  ) {
    return false;
  }

  if (
    transpositionTableEntry.bound !== TRANSPOSITION_TABLE_BOUND.EXACT &&
    transpositionTableEntry.bound !== TRANSPOSITION_TABLE_BOUND.LOWER_BOUND
  ) {
    return false;
  }

  return (
    Math.abs(transpositionTableEntry.score) <
    CHECKMATE_SCORE - SINGULAR_EXTENSION_MATE_SCORE_BUFFER
  );
};

export const getSingularExtensionBeta = (
  transpositionTableScore: number,
  depth: number,
): number =>
  transpositionTableScore - depth * SINGULAR_EXTENSION_BETA_MARGIN_PER_DEPTH;

export const getSingularExtensionSearchDepth = (depth: number): number =>
  Math.max(0, Math.trunc((depth - 1) / SINGULAR_EXTENSION_SEARCH_DEPTH_DIVISOR));

export const getSingularExtensionAmount = (): number =>
  SINGULAR_EXTENSION_AMOUNT;
