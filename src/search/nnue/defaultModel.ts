import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NNUE_DEFAULT_RANDOM_SEED } from "../constants/nnue";
import type { NnueModelMetadata } from "../types/nnue";
import { getNnueArchitectureName } from "./architecture";
import { createRandomNnueModel } from "./model";
import { deserializeNnueModel } from "./serialization";

export const DEFAULT_NNUE_MODEL_METADATA: NnueModelMetadata = {
  id: "seeded-random-nnue-v1",
  architecture: getNnueArchitectureName(),
  createdAt: "2026-06-19T00:00:00.000Z",
  source: "deterministic-random-seed",
  estimatedElo: null,
  trainingGames: 0,
  trainingPositions: 0,
};

const DEFAULT_NNUE_CHECKPOINT_RELATIVE_PATH =
  "models/nnue/defaultCheckpoint/model.dce-nnue";

const getDefaultNnueCheckpointCandidatePaths = (): string[] => {
  const currentDirectory =
    typeof import.meta.url === "string"
      ? dirname(fileURLToPath(import.meta.url))
      : __dirname;

  return [
    resolve(currentDirectory, "../../../", DEFAULT_NNUE_CHECKPOINT_RELATIVE_PATH),
    resolve(currentDirectory, "../", DEFAULT_NNUE_CHECKPOINT_RELATIVE_PATH),
    resolve(process.cwd(), DEFAULT_NNUE_CHECKPOINT_RELATIVE_PATH),
  ];
};

export const createSeededRandomDefaultNnueModel = () =>
  createRandomNnueModel(DEFAULT_NNUE_MODEL_METADATA, NNUE_DEFAULT_RANDOM_SEED);

export const createDefaultNnueModel = () => {
  for (const checkpointPath of getDefaultNnueCheckpointCandidatePaths()) {
    if (existsSync(checkpointPath)) {
      return deserializeNnueModel(readFileSync(checkpointPath));
    }
  }

  return createSeededRandomDefaultNnueModel();
};

export const loadNnueModelFromPath = (modelPath?: string) =>
  modelPath === undefined
    ? createDefaultNnueModel()
    : deserializeNnueModel(readFileSync(modelPath));
