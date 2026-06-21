import { NNUE_DEFAULT_RANDOM_SEED } from "../constants/nnue";
import type { NnueModel, NnueModelMetadata } from "../types/nnue";
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

let cachedModelBuffer: Uint8Array | null = null;

export const setDefaultNnueModelBuffer = (buffer: Uint8Array | null) => {
  cachedModelBuffer = buffer;
};

export const getDefaultNnueModelBuffer = () => cachedModelBuffer;

export const createSeededRandomDefaultNnueModel = () =>
  createRandomNnueModel(DEFAULT_NNUE_MODEL_METADATA, NNUE_DEFAULT_RANDOM_SEED);

const tryLoadFromFs = async (): Promise<NnueModel | null> => {
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const { existsSync, readFileSync } = await import("node:fs");
      const { dirname, resolve } = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      const DEFAULT_NNUE_CHECKPOINT_RELATIVE_PATH =
        "models/nnue/defaultCheckpoint/model.dce-nnue";

      const candidatePaths = (): string[] => {
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

      for (const checkpointPath of candidatePaths()) {
        if (existsSync(checkpointPath)) {
          return deserializeNnueModel(readFileSync(checkpointPath));
        }
      }
    } catch {
    }
  }
  return null;
};

export const createDefaultNnueModel = async (): Promise<NnueModel> => {
  if (cachedModelBuffer) {
    return deserializeNnueModel(cachedModelBuffer);
  }

  const fsModel = await tryLoadFromFs();
  if (fsModel) return fsModel;

  return createSeededRandomDefaultNnueModel();
};

export const loadNnueModelFromPath = async (modelPath?: string): Promise<NnueModel> =>
  modelPath === undefined
    ? createDefaultNnueModel()
    : deserializeNnueModel(new Uint8Array(
        typeof process !== "undefined" && process.versions?.node
          ? (await import("node:fs")).readFileSync(modelPath)
          : (await (await fetch(modelPath)).arrayBuffer()),
      ));
