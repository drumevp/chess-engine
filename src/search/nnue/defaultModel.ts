import { NNUE_DEFAULT_RANDOM_SEED } from "../constants/nnue";
import type { NnueModelMetadata } from "../types/nnue";
import { getNnueArchitectureName } from "./architecture";
import { createRandomNnueModel } from "./model";

export const DEFAULT_NNUE_MODEL_METADATA: NnueModelMetadata = {
  id: "seeded-random-stockfish-like-v1",
  architecture: getNnueArchitectureName(),
  createdAt: "2026-06-19T00:00:00.000Z",
  source: "deterministic-random-seed",
  estimatedElo: null,
  trainingGames: 0,
};

export const createDefaultNnueModel = () =>
  createRandomNnueModel(DEFAULT_NNUE_MODEL_METADATA, NNUE_DEFAULT_RANDOM_SEED);
