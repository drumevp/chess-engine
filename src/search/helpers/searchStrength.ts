import {
  DEFAULT_MAX_SEARCH_STRENGTH_ELO,
  DEFAULT_MIN_SEARCH_STRENGTH_ELO,
  MAX_STRENGTH_MAX_NODES,
  MIN_STRENGTH_MAX_NODES,
} from "../constants/searchStrength";
import type { SearchLimits } from "../types/search";

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

export const normalizeSearchLimits = (
  limits: SearchLimits,
): SearchLimits => {
  if (limits.strengthElo === undefined) {
    return limits;
  }

  const minElo = limits.minStrengthElo ?? DEFAULT_MIN_SEARCH_STRENGTH_ELO;
  const maxElo = limits.maxStrengthElo ?? DEFAULT_MAX_SEARCH_STRENGTH_ELO;
  const strengthElo = clamp(limits.strengthElo, minElo, maxElo);
  const range = Math.max(1, maxElo - minElo);
  const t = (strengthElo - minElo) / range;
  const nodeRatio = MAX_STRENGTH_MAX_NODES / MIN_STRENGTH_MAX_NODES;
  const strengthMaxNodes = Math.round(
    MIN_STRENGTH_MAX_NODES * Math.pow(nodeRatio, t),
  );

  return {
    ...limits,
    maxNodes: Math.min(
      limits.maxNodes ?? strengthMaxNodes,
      strengthMaxNodes,
    ),
  };
};
