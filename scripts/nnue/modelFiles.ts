import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
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
  seed: number;
};

const isJsonPath = (path: string): boolean => path.endsWith(".json");

export const getTimestamp = (): string =>
  new Date().toISOString().replaceAll(":", "-");

export const loadNnueModel = async (
  modelPath?: string | null,
): Promise<NnueModel> => {
  if (modelPath === undefined || modelPath === null || modelPath === "default") {
    return createDefaultNnueModel();
  }

  const resolvedPath = resolve(modelPath);
  const bytes = await readFile(resolvedPath);

  if (!isJsonPath(resolvedPath)) {
    return deserializeNnueModel(bytes);
  }

  const descriptor = JSON.parse(bytes.toString("utf8")) as SeededModelDescriptor;

  return createRandomNnueModel(descriptor.metadata, descriptor.seed);
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
