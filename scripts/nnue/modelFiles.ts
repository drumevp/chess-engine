import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { NNUE_DEFAULT_RANDOM_SEED } from "../../src/search/constants/nnue";
import { DEFAULT_NNUE_MODEL_METADATA } from "../../src/search/nnue/defaultModel";
import { createRandomNnueModel } from "../../src/search/nnue/model";
import {
  deserializeNnueModel,
  serializeNnueModel,
} from "../../src/search/nnue/serialization";
import type {
  NnueModel,
  NnueModelMetadata,
} from "../../src/search/types/nnue";

type SeededModelDescriptor = {
  metadata: NnueModelMetadata;
  seed?: number;
  checkpoint?: string | null;
};

const isJsonPath = (path: string): boolean => path.endsWith(".json");
export const DEFAULT_NNUE_CHECKPOINT_DIRECTORY =
  "models/nnue/defaultCheckpoint";
export const DEFAULT_NNUE_CHECKPOINT_FILENAME = "model.dce-nnue";
export const DEFAULT_NNUE_CHECKPOINT_PATH = `${DEFAULT_NNUE_CHECKPOINT_DIRECTORY}/${DEFAULT_NNUE_CHECKPOINT_FILENAME}`;

export const getTimestamp = (): string =>
  new Date().toISOString().replaceAll(":", "-");

export const loadNnueModel = async (
  modelPath?: string | null,
): Promise<NnueModel> => {
  if (modelPath === undefined || modelPath === null || modelPath === "default") {
    return loadNnueModel(DEFAULT_NNUE_CHECKPOINT_PATH);
  }

  const resolvedPath = resolve(modelPath);
  const bytes = await readFile(resolvedPath);

  if (!isJsonPath(resolvedPath)) {
    return deserializeNnueModel(bytes);
  }

  const descriptor = JSON.parse(bytes.toString("utf8")) as SeededModelDescriptor;

  if (descriptor.checkpoint !== undefined && descriptor.checkpoint !== null) {
    const checkpointPath = resolve(dirname(resolvedPath), descriptor.checkpoint);

    return deserializeNnueModel(await readFile(checkpointPath));
  }

  return createRandomNnueModel(
    descriptor.metadata,
    descriptor.seed ?? undefined,
  );
};

export const createSeededDefaultNnueModel = (): NnueModel =>
  createRandomNnueModel(DEFAULT_NNUE_MODEL_METADATA, NNUE_DEFAULT_RANDOM_SEED);

export const ensureDefaultNnueCheckpoint = async (): Promise<string> => {
  const checkpointPath = resolve(DEFAULT_NNUE_CHECKPOINT_PATH);

  try {
    await readFile(checkpointPath);

    return checkpointPath;
  } catch {
    const model = createSeededDefaultNnueModel();

    await mkdir(dirname(checkpointPath), { recursive: true });
    await writeFile(checkpointPath, serializeNnueModel(model));

    return checkpointPath;
  }
};

export const promoteDefaultNnueCheckpoint = async (
  checkpointPath: string,
): Promise<string> => {
  const defaultCheckpointPath = resolve(DEFAULT_NNUE_CHECKPOINT_PATH);

  await mkdir(dirname(defaultCheckpointPath), { recursive: true });
  await copyFile(resolve(checkpointPath), defaultCheckpointPath);

  return defaultCheckpointPath;
};

export const writeNnueCheckpoint = async (
  model: NnueModel,
  outputDirectory = "models/nnue/checkpoints",
): Promise<string> => {
  const resolvedDirectory = resolve(outputDirectory);
  const outputPath = resolve(
    resolvedDirectory,
    `${getTimestamp()}--${model.metadata.id}.dce-nnue`,
  );

  await mkdir(resolvedDirectory, { recursive: true });
  await writeFile(outputPath, serializeNnueModel(model));

  return outputPath;
};

export const getModelLabel = (modelPath?: string | null): string => {
  if (modelPath === undefined || modelPath === null || modelPath === "default") {
    return "default";
  }

  return basename(modelPath);
};
