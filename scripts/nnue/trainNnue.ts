import { createReadStream } from "node:fs";
import { basename } from "node:path";
import { createInterface } from "node:readline/promises";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import { NNUE_HIDDEN_ONE } from "../../src/search/constants/nnue";
import {
  evaluateNnueWithTrace,
} from "../../src/search/nnue/inference";
import { createNnueScratch } from "../../src/search/nnue/scratch";
import type { NnueModel } from "../../src/search/types/nnue";
import { getArg, getNumberArg } from "./args";
import { loadNnueModel, writeNnueCheckpoint } from "./modelFiles";

type TrainingRecord = {
  fen: string;
  scoreCp: number;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

const clampInt8 = (value: number): number => clamp(value, -127, 127);

const clampTarget = (scoreCp: number): number => clamp(scoreCp, -4_000, 4_000);

const loadTrainingRecords = async (
  datasetPath: string,
): Promise<TrainingRecord[]> => {
  const records: TrainingRecord[] = [];
  const lines = createInterface({
    input: createReadStream(datasetPath),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = JSON.parse(line) as TrainingRecord;

    if (
      typeof record.fen !== "string" ||
      !Number.isFinite(record.scoreCp)
    ) {
      throw new Error(`Invalid training record: ${line}`);
    }

    records.push(record);
  }

  return records;
};

const updateOutputLayer = (
  model: NnueModel,
  record: TrainingRecord,
  scratch: ReturnType<typeof createNnueScratch>,
  learningRate: number,
  maxWeightDelta: number,
  maxBiasDelta: number,
): { absoluteError: number; squaredError: number } => {
  const position = generateFenToPosition(record.fen);
  const trace = evaluateNnueWithTrace(model, position, scratch);
  const target = clampTarget(record.scoreCp);
  const error = target - trace.score;
  const absoluteError = Math.abs(error);
  const layerStack = model.weights.layerStacks[trace.layerStackIndex];
  let biasDelta = Math.trunc(error * learningRate);

  if (biasDelta === 0 && absoluteError >= 16) {
    biasDelta = Math.sign(error);
  }

  layerStack.fc2Bias[0] += clamp(biasDelta, -maxBiasDelta, maxBiasDelta);

  for (let i = 0; i < trace.fc1Activation.length; i++) {
    const activation = trace.fc1Activation[i];

    if (activation === 0) {
      continue;
    }

    let delta = Math.trunc(
      (error * learningRate * activation) / NNUE_HIDDEN_ONE,
    );

    if (delta === 0 && absoluteError >= 64 && activation >= NNUE_HIDDEN_ONE / 2) {
      delta = Math.sign(error);
    }

    if (delta === 0) {
      continue;
    }

    layerStack.fc2Weights[i] = clampInt8(
      layerStack.fc2Weights[i] +
        clamp(delta, -maxWeightDelta, maxWeightDelta),
    );
  }

  return {
    absoluteError,
    squaredError: error * error,
  };
};

const datasetPath = getArg("--dataset", "");

if (datasetPath.length === 0) {
  throw new Error("Missing --dataset path");
}

const model = await loadNnueModel(getArg("--model", "default"));
const epochs = getNumberArg("--epochs", 1);
const learningRate = getNumberArg("--learning-rate", 0.002);
const maxWeightDelta = getNumberArg("--max-weight-delta", 2);
const maxBiasDelta = getNumberArg("--max-bias-delta", 128);
const outputDirectory = getArg("--output-dir", "models/nnue/checkpoints");
const records = await loadTrainingRecords(datasetPath);
const scratch = createNnueScratch();

if (records.length === 0) {
  throw new Error("Training dataset is empty");
}

let trainedPositions = 0;

for (let epoch = 1; epoch <= epochs; epoch++) {
  let absoluteErrorTotal = 0;
  let squaredErrorTotal = 0;

  for (const record of records) {
    const loss = updateOutputLayer(
      model,
      record,
      scratch,
      learningRate,
      maxWeightDelta,
      maxBiasDelta,
    );

    absoluteErrorTotal += loss.absoluteError;
    squaredErrorTotal += loss.squaredError;
    trainedPositions++;
  }

  console.log(
    JSON.stringify({
      epoch,
      meanAbsoluteError: absoluteErrorTotal / records.length,
      rootMeanSquaredError: Math.sqrt(squaredErrorTotal / records.length),
    }),
  );
}

model.metadata = {
  ...model.metadata,
  id: `${model.metadata.id}-trained`,
  createdAt: new Date().toISOString(),
  source: `supervised:${basename(datasetPath)}`,
  estimatedElo: null,
  trainingPositions: model.metadata.trainingPositions + trainedPositions,
};

const outputPath = await writeNnueCheckpoint(model, outputDirectory);

console.log(`Wrote ${outputPath}`);
