import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import { DEFAULT_NNUE_MODEL_METADATA } from "../../src/search/nnue/defaultModel";
import { evaluateNnue } from "../../src/search/nnue/inference";
import { createMaterialNnueModel } from "../../src/search/nnue/model";
import { createNnueScratch } from "../../src/search/nnue/scratch";
import { isPlausibleNnuePosition } from "../../src/search/nnue/positionValidation";
import { getArg, getNumberArg, hasArg } from "./args";
import {
  createFeatureCache,
  readFeatureCacheBatches,
} from "./featureCache";
import { loadNnueModel } from "./modelFiles";
import { predictTensorNnueBatch } from "./tensorTraining";
import type { TrainingRecord } from "./trainingPass";

const positions = Math.max(1, Math.trunc(getNumberArg("--positions", 128)));
const inputPath = resolve(
  getArg(
    "--data",
    "models/nnue/runs/2026-06-19T15-00-24.571Z/validation.jsonl",
  ),
);
const includeFullThreats = hasArg("--full-threats");
const modelPath = getArg("--model", "material");
const model =
  modelPath === "material"
    ? createMaterialNnueModel({
        ...DEFAULT_NNUE_MODEL_METADATA,
        id: "material-seeded-nnue-v1",
        source: "material-seeded",
      })
    : await loadNnueModel(modelPath);
const cachePath = resolve(
  tmpdir(),
  `dce-nnue-tensor-parity-${process.pid}.bin`,
);

await createFeatureCache(inputPath, cachePath, {
  includeFullThreats,
  logEvery: positions,
  maxPositions: positions,
});

const batchIterator = readFeatureCacheBatches(cachePath, {
  batchSize: positions,
  shuffleSeed: null,
});
const firstBatch = await batchIterator.next();

if (firstBatch.done) {
  throw new Error("Feature cache did not contain a batch");
}

const tensorScores = predictTensorNnueBatch(model, firstBatch.value, {
  useFullThreats: includeFullThreats,
  quantized: true,
});
const lines = createInterface({
  input: createReadStream(inputPath),
  crlfDelay: Infinity,
});
const scratch = createNnueScratch();
let compared = 0;
let absoluteDifference = 0;
let maxDifference = 0;

try {
  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = JSON.parse(line) as TrainingRecord;
    const position = generateFenToPosition(record.fen);

    if (!isPlausibleNnuePosition(position)) {
      continue;
    }

    const engineScore = evaluateNnue(
      model,
      position,
      scratch,
    );
    const difference = Math.abs(engineScore - tensorScores[compared]);

    absoluteDifference += difference;
    maxDifference = Math.max(maxDifference, difference);
    compared++;

    if (compared >= tensorScores.length) {
      break;
    }
  }
} finally {
  lines.close();
  await batchIterator.return(undefined);
  await unlink(cachePath).catch(() => undefined);
}

console.log(
  JSON.stringify(
    {
      backend: "tensorflow",
      positions: compared,
      fullThreats: includeFullThreats,
      meanAbsoluteDifference: absoluteDifference / compared,
      maxDifference,
    },
    null,
    2,
  ),
);

if (maxDifference > 3) {
  throw new Error(`Tensor inference parity failed: max difference ${maxDifference}`);
}
