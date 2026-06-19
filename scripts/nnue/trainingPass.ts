import { COLOR } from "../../src/engine/constants/color";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import type { Position } from "../../src/engine/types/position";
import {
  NNUE_FC_0_ACTIVATION_INPUTS,
  NNUE_FC_0_OUTPUTS,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
  NNUE_FEATURE_VECTOR_DIMENSIONS,
  NNUE_FT_MAX,
  NNUE_HIDDEN_MAX,
  NNUE_HIDDEN_ONE,
  NNUE_OUTPUT_SCALE,
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE,
  NNUE_WEIGHT_SCALE_BITS,
} from "../../src/search/constants/nnue";
import { appendHalfKaActiveFeatures } from "../../src/search/nnue/features";
import { appendFullThreatActiveFeatures } from "../../src/search/nnue/fullThreats";
import { getNnueLayerStackIndex } from "../../src/search/nnue/inference";
import type { NnueModel } from "../../src/search/types/nnue";
import type { NnueTrainingScratch } from "./trainingScratch";
import {
  applyGradient,
  fakeQuantizeWeight,
  quantizeTrainableNnueWeights,
  type TrainableNnueNetworkWeights,
  type TrainableNnueWeights,
} from "./trainingWeights";

export type TrainingRecord = {
  fen: string;
  scoreCp: number;
};

export type NnueTrainingRates = {
  network: number;
  feature: number;
  threat: number;
  psqt: number;
  bias: number;
};

export type NnueTrainingOptions = {
  rates: NnueTrainingRates;
  targetClamp: number;
  errorClamp: number;
};

export type NnueTrainingLoss = {
  predicted: number;
  target: number;
  absoluteError: number;
  squaredError: number;
};

type ActiveFeatureCounts = {
  whiteHalfKa: number;
  blackHalfKa: number;
  whiteFullThreat: number;
  blackFullThreat: number;
};

const POSITIONAL_SCORE_SCALE =
  (600 * NNUE_OUTPUT_SCALE) /
  (NNUE_HIDDEN_ONE * (1 << NNUE_WEIGHT_SCALE_BITS) * 2) /
  NNUE_OUTPUT_SCALE;
const OUTPUT_SUM_SCORE_SCALE = (131 / 128) * POSITIONAL_SCORE_SCALE;
const PSQT_SCORE_SCALE = (125 / 128) / (2 * NNUE_OUTPUT_SCALE);

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

const assertFinite = (
  value: number,
  name: string,
  record: TrainingRecord,
): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} is not finite for ${record.fen}: ${value}`);
  }
};

const clippedRelu = (value: number, maxValue: number): number => {
  if (value <= 0) {
    return 0;
  }

  if (value >= maxValue) {
    return maxValue;
  }

  return value;
};

const clippedReluDerivative = (value: number, maxValue: number): number =>
  value > 0 && value < maxValue ? 1 : 0;

const divideByWeightScale = (value: number): number =>
  Math.floor(value / (1 << NNUE_WEIGHT_SCALE_BITS));

const normalizeFen = (fen: string): string => {
  const parts = fen.trim().split(/\s+/);

  if (parts.length === 4) {
    return `${fen} 0 1`;
  }

  return fen;
};

const addFeatureRowsToAccumulator = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  accumulator: Float32Array,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

    for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
      accumulator[i] += fakeQuantizeWeight(weights[weightIndex++], -32_768, 32_767);
    }
  }
};

const addThreatRowsToAccumulator = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  accumulator: Float32Array,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

    for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
      accumulator[i] += fakeQuantizeWeight(weights[weightIndex++], -127, 127);
    }
  }
};

const addPsqtRowsToAccumulator = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  accumulator: Float32Array,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_PSQ_BUCKETS;

    for (let i = 0; i < NNUE_PSQ_BUCKETS; i++) {
      accumulator[i] += fakeQuantizeWeight(
        weights[weightIndex++],
        -2_147_483_648,
        2_147_483_647,
      );
    }
  }
};

const refreshTrainingAccumulator = (
  weights: TrainableNnueWeights,
  position: Position,
  perspective: typeof COLOR.WHITE | typeof COLOR.BLACK,
  halfKaFeatures: Uint32Array,
  fullThreatFeatures: Uint32Array,
  scratch: NnueTrainingScratch,
  accumulator: Float32Array,
  psqtAccumulator: Float32Array,
): { halfKa: number; fullThreat: number } => {
  for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
    accumulator[i] = fakeQuantizeWeight(weights.featureBias[i], -32_768, 32_767);
  }

  psqtAccumulator.fill(0);

  const halfKaCount = appendHalfKaActiveFeatures(
    position,
    perspective,
    halfKaFeatures,
    0,
  );

  addFeatureRowsToAccumulator(
    weights.featureWeights,
    halfKaFeatures,
    halfKaCount,
    accumulator,
  );
  addPsqtRowsToAccumulator(
    weights.psqtWeights,
    halfKaFeatures,
    halfKaCount,
    psqtAccumulator,
  );

  const fullThreatCount = appendFullThreatActiveFeatures(
    position,
    perspective,
    fullThreatFeatures,
    0,
    scratch.fullThreatAttackScratch,
  );

  addThreatRowsToAccumulator(
    weights.threatWeights,
    fullThreatFeatures,
    fullThreatCount,
    accumulator,
  );
  addPsqtRowsToAccumulator(
    weights.threatPsqtWeights,
    fullThreatFeatures,
    fullThreatCount,
    psqtAccumulator,
  );

  return { halfKa: halfKaCount, fullThreat: fullThreatCount };
};

const writeFeatureVector = (
  position: Position,
  scratch: NnueTrainingScratch,
): void => {
  const usAccumulator =
    position.color === COLOR.WHITE
      ? scratch.whiteAccumulator
      : scratch.blackAccumulator;
  const themAccumulator =
    position.color === COLOR.WHITE
      ? scratch.blackAccumulator
      : scratch.whiteAccumulator;

  for (let i = 0; i < NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE; i++) {
    const usLeft = clippedRelu(usAccumulator[i], NNUE_FT_MAX);
    const usRight = clippedRelu(
      usAccumulator[i + NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE],
      NNUE_FT_MAX,
    );
    const themLeft = clippedRelu(themAccumulator[i], NNUE_FT_MAX);
    const themRight = clippedRelu(
      themAccumulator[i + NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE],
      NNUE_FT_MAX,
    );

    scratch.transformedFeatures[i] = Math.trunc(
      (usLeft * usRight) / NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
    );
    scratch.transformedFeatures[i + NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE] =
      Math.trunc(
        (themLeft * themRight) / NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
      );
  }
};

const propagateFc0 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
): void => {
  for (let output = 0; output < NNUE_FC_0_OUTPUTS_WITH_BUCKET; output++) {
    let sum = fakeQuantizeWeight(
      weights.fc0Bias[output],
      -2_147_483_648,
      2_147_483_647,
    );
    let weightIndex = output;

    for (let input = 0; input < NNUE_FEATURE_VECTOR_DIMENSIONS; input++) {
      sum +=
        scratch.transformedFeatures[input] *
        fakeQuantizeWeight(weights.fc0Weights[weightIndex], -127, 127);
      weightIndex += NNUE_FC_0_OUTPUTS_WITH_BUCKET;
    }

    scratch.fc0Output[output] = divideByWeightScale(sum);
  }
};

const activateFc0 = (scratch: NnueTrainingScratch): void => {
  for (let i = 0; i < NNUE_FC_0_OUTPUTS; i++) {
    const value = clippedRelu(scratch.fc0Output[i], NNUE_HIDDEN_MAX);

    scratch.fc0Activation[i] = Math.trunc((value * value) / NNUE_HIDDEN_ONE);
    scratch.fc0Activation[i + NNUE_FC_0_OUTPUTS] = value;
  }
};

const propagateFc1 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
): void => {
  for (let output = 0; output < NNUE_FC_1_OUTPUTS; output++) {
    let sum = fakeQuantizeWeight(
      weights.fc1Bias[output],
      -2_147_483_648,
      2_147_483_647,
    );
    let weightIndex = output;

    for (let input = 0; input < NNUE_FC_0_ACTIVATION_INPUTS; input++) {
      sum +=
        scratch.fc0Activation[input] *
        fakeQuantizeWeight(weights.fc1Weights[weightIndex], -127, 127);
      weightIndex += NNUE_FC_1_OUTPUTS;
    }

    scratch.fc1Output[output] = divideByWeightScale(sum);
    scratch.fc1Activation[output] = clippedRelu(
      scratch.fc1Output[output],
      NNUE_HIDDEN_MAX,
    );
  }
};

const getOutputSum = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
): number => {
  let sum =
    fakeQuantizeWeight(weights.fc2Bias[0], -2_147_483_648, 2_147_483_647) +
    scratch.fc0Output[NNUE_FC_0_OUTPUTS];

  for (let input = 0; input < NNUE_FC_1_OUTPUTS; input++) {
    sum +=
      scratch.fc1Activation[input] *
      fakeQuantizeWeight(weights.fc2Weights[input], -127, 127);
  }

  return sum;
};

const forward = (
  weights: TrainableNnueWeights,
  position: Position,
  scratch: NnueTrainingScratch,
): { score: number; layerStackIndex: number; activeCounts: ActiveFeatureCounts } => {
  const whiteCounts = refreshTrainingAccumulator(
    weights,
    position,
    COLOR.WHITE,
    scratch.whiteHalfKaFeatures,
    scratch.whiteFullThreatFeatures,
    scratch,
    scratch.whiteAccumulator,
    scratch.whitePsqtAccumulator,
  );
  const blackCounts = refreshTrainingAccumulator(
    weights,
    position,
    COLOR.BLACK,
    scratch.blackHalfKaFeatures,
    scratch.blackFullThreatFeatures,
    scratch,
    scratch.blackAccumulator,
    scratch.blackPsqtAccumulator,
  );
  const layerStackIndex = getNnueLayerStackIndex(position);
  const layerStack = weights.layerStacks[layerStackIndex];

  writeFeatureVector(position, scratch);
  propagateFc0(layerStack, scratch);
  activateFc0(scratch);
  propagateFc1(layerStack, scratch);

  const outputSum = getOutputSum(layerStack, scratch);
  const whitePsqt = scratch.whitePsqtAccumulator[layerStackIndex];
  const blackPsqt = scratch.blackPsqtAccumulator[layerStackIndex];
  const psqt =
    position.color === COLOR.WHITE ? whitePsqt - blackPsqt : blackPsqt - whitePsqt;
  const positionalScore = outputSum * POSITIONAL_SCORE_SCALE;
  const psqtScore = psqt / (2 * NNUE_OUTPUT_SCALE);
  const score = (125 * psqtScore + 131 * positionalScore) / 128;

  return {
    score,
    layerStackIndex,
    activeCounts: {
      whiteHalfKa: whiteCounts.halfKa,
      blackHalfKa: blackCounts.halfKa,
      whiteFullThreat: whiteCounts.fullThreat,
      blackFullThreat: blackCounts.fullThreat,
    },
  };
};

const clearGradients = (scratch: NnueTrainingScratch): void => {
  scratch.gradTransformedFeatures.fill(0);
  scratch.gradFc0Output.fill(0);
  scratch.gradFc0Activation.fill(0);
  scratch.gradFc1Output.fill(0);
  scratch.gradFc1Activation.fill(0);
  scratch.gradWhiteAccumulator.fill(0);
  scratch.gradBlackAccumulator.fill(0);
};

const updateFc2 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
  gradOutputSum: number,
  rates: NnueTrainingRates,
): void => {
  weights.fc2Bias[0] = applyGradient(
    weights.fc2Bias[0],
    gradOutputSum,
    rates.bias,
    -2_147_483_648,
    2_147_483_647,
  );

  for (let input = 0; input < NNUE_FC_1_OUTPUTS; input++) {
    const weight = fakeQuantizeWeight(weights.fc2Weights[input], -127, 127);

    scratch.gradFc1Activation[input] += gradOutputSum * weight;
    weights.fc2Weights[input] = applyGradient(
      weights.fc2Weights[input],
      gradOutputSum * scratch.fc1Activation[input],
      rates.network,
      -127,
      127,
    );
  }
};

const backpropFc1 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
  rates: NnueTrainingRates,
): void => {
  for (let output = 0; output < NNUE_FC_1_OUTPUTS; output++) {
    const gradOutput =
      scratch.gradFc1Activation[output] *
      clippedReluDerivative(scratch.fc1Output[output], NNUE_HIDDEN_MAX);
    const gradPreActivation = gradOutput / (1 << NNUE_WEIGHT_SCALE_BITS);

    scratch.gradFc1Output[output] = gradOutput;
    weights.fc1Bias[output] = applyGradient(
      weights.fc1Bias[output],
      gradPreActivation,
      rates.bias,
      -2_147_483_648,
      2_147_483_647,
    );

    let weightIndex = output;

    for (let input = 0; input < NNUE_FC_0_ACTIVATION_INPUTS; input++) {
      const weight = fakeQuantizeWeight(
        weights.fc1Weights[weightIndex],
        -127,
        127,
      );

      scratch.gradFc0Activation[input] += gradPreActivation * weight;
      weights.fc1Weights[weightIndex] = applyGradient(
        weights.fc1Weights[weightIndex],
        gradPreActivation * scratch.fc0Activation[input],
        rates.network,
        -127,
        127,
      );
      weightIndex += NNUE_FC_1_OUTPUTS;
    }
  }
};

const backpropFc0Activations = (scratch: NnueTrainingScratch): void => {
  for (let i = 0; i < NNUE_FC_0_OUTPUTS; i++) {
    const fc0Value = scratch.fc0Output[i];
    const derivative = clippedReluDerivative(fc0Value, NNUE_HIDDEN_MAX);
    const clippedValue = clippedRelu(fc0Value, NNUE_HIDDEN_MAX);

    scratch.gradFc0Output[i] +=
      scratch.gradFc0Activation[i] *
        derivative *
        ((2 * clippedValue) / NNUE_HIDDEN_ONE) +
      scratch.gradFc0Activation[i + NNUE_FC_0_OUTPUTS] * derivative;
  }
};

const backpropFc0 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
  rates: NnueTrainingRates,
): void => {
  for (let output = 0; output < NNUE_FC_0_OUTPUTS_WITH_BUCKET; output++) {
    const gradPreActivation =
      scratch.gradFc0Output[output] / (1 << NNUE_WEIGHT_SCALE_BITS);

    weights.fc0Bias[output] = applyGradient(
      weights.fc0Bias[output],
      gradPreActivation,
      rates.bias,
      -2_147_483_648,
      2_147_483_647,
    );

    let weightIndex = output;

    for (let input = 0; input < NNUE_FEATURE_VECTOR_DIMENSIONS; input++) {
      const weight = fakeQuantizeWeight(
        weights.fc0Weights[weightIndex],
        -127,
        127,
      );

      scratch.gradTransformedFeatures[input] += gradPreActivation * weight;
      weights.fc0Weights[weightIndex] = applyGradient(
        weights.fc0Weights[weightIndex],
        gradPreActivation * scratch.transformedFeatures[input],
        rates.network,
        -127,
        127,
      );
      weightIndex += NNUE_FC_0_OUTPUTS_WITH_BUCKET;
    }
  }
};

const addFeatureTransformerGradient = (
  gradAccumulator: Float32Array,
  gradFeature: number,
  accumulator: Float32Array,
  index: number,
): void => {
  const leftRaw = accumulator[index];
  const rightIndex = index + NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE;
  const rightRaw = accumulator[rightIndex];
  const left = clippedRelu(leftRaw, NNUE_FT_MAX);
  const right = clippedRelu(rightRaw, NNUE_FT_MAX);

  gradAccumulator[index] +=
    gradFeature *
    clippedReluDerivative(leftRaw, NNUE_FT_MAX) *
    (right / NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR);
  gradAccumulator[rightIndex] +=
    gradFeature *
    clippedReluDerivative(rightRaw, NNUE_FT_MAX) *
    (left / NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR);
};

const backpropFeatureTransformer = (
  position: Position,
  scratch: NnueTrainingScratch,
): void => {
  const usAccumulator =
    position.color === COLOR.WHITE
      ? scratch.whiteAccumulator
      : scratch.blackAccumulator;
  const themAccumulator =
    position.color === COLOR.WHITE
      ? scratch.blackAccumulator
      : scratch.whiteAccumulator;
  const gradUsAccumulator =
    position.color === COLOR.WHITE
      ? scratch.gradWhiteAccumulator
      : scratch.gradBlackAccumulator;
  const gradThemAccumulator =
    position.color === COLOR.WHITE
      ? scratch.gradBlackAccumulator
      : scratch.gradWhiteAccumulator;

  for (let i = 0; i < NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE; i++) {
    addFeatureTransformerGradient(
      gradUsAccumulator,
      scratch.gradTransformedFeatures[i],
      usAccumulator,
      i,
    );
    addFeatureTransformerGradient(
      gradThemAccumulator,
      scratch.gradTransformedFeatures[
        i + NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE
      ],
      themAccumulator,
      i,
    );
  }
};

const updateFeatureBias = (
  weights: TrainableNnueWeights,
  scratch: NnueTrainingScratch,
  rates: NnueTrainingRates,
): void => {
  for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
    weights.featureBias[i] = applyGradient(
      weights.featureBias[i],
      scratch.gradWhiteAccumulator[i] + scratch.gradBlackAccumulator[i],
      rates.bias,
      -32_768,
      32_767,
    );
  }
};

const updateFeatureRows = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  gradients: Float32Array,
  learningRate: number,
  min: number,
  max: number,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

    for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
      weights[weightIndex] = applyGradient(
        weights[weightIndex],
        gradients[i],
        learningRate,
        min,
        max,
      );
      weightIndex++;
    }
  }
};

const updatePsqtRows = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  bucket: number,
  gradient: number,
  learningRate: number,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    const weightIndex = features[featureIndex] * NNUE_PSQ_BUCKETS + bucket;

    weights[weightIndex] = applyGradient(
      weights[weightIndex],
      gradient,
      learningRate,
      -2_147_483_648,
      2_147_483_647,
    );
  }
};

const backprop = (
  weights: TrainableNnueWeights,
  position: Position,
  scratch: NnueTrainingScratch,
  layerStackIndex: number,
  activeCounts: ActiveFeatureCounts,
  gradScore: number,
  rates: NnueTrainingRates,
): void => {
  const layerStack = weights.layerStacks[layerStackIndex];
  const gradOutputSum = gradScore * OUTPUT_SUM_SCORE_SCALE;
  const gradPsqt = gradScore * PSQT_SCORE_SCALE;
  const whitePsqtGradient =
    position.color === COLOR.WHITE ? gradPsqt : -gradPsqt;
  const blackPsqtGradient = -whitePsqtGradient;

  clearGradients(scratch);
  updateFc2(layerStack, scratch, gradOutputSum, rates);
  scratch.gradFc0Output[NNUE_FC_0_OUTPUTS] += gradOutputSum;
  backpropFc1(layerStack, scratch, rates);
  backpropFc0Activations(scratch);
  backpropFc0(layerStack, scratch, rates);
  backpropFeatureTransformer(position, scratch);
  updateFeatureBias(weights, scratch, rates);
  updateFeatureRows(
    weights.featureWeights,
    scratch.whiteHalfKaFeatures,
    activeCounts.whiteHalfKa,
    scratch.gradWhiteAccumulator,
    rates.feature,
    -32_768,
    32_767,
  );
  updateFeatureRows(
    weights.featureWeights,
    scratch.blackHalfKaFeatures,
    activeCounts.blackHalfKa,
    scratch.gradBlackAccumulator,
    rates.feature,
    -32_768,
    32_767,
  );
  updateFeatureRows(
    weights.threatWeights,
    scratch.whiteFullThreatFeatures,
    activeCounts.whiteFullThreat,
    scratch.gradWhiteAccumulator,
    rates.threat,
    -127,
    127,
  );
  updateFeatureRows(
    weights.threatWeights,
    scratch.blackFullThreatFeatures,
    activeCounts.blackFullThreat,
    scratch.gradBlackAccumulator,
    rates.threat,
    -127,
    127,
  );
  updatePsqtRows(
    weights.psqtWeights,
    scratch.whiteHalfKaFeatures,
    activeCounts.whiteHalfKa,
    layerStackIndex,
    whitePsqtGradient,
    rates.psqt,
  );
  updatePsqtRows(
    weights.psqtWeights,
    scratch.blackHalfKaFeatures,
    activeCounts.blackHalfKa,
    layerStackIndex,
    blackPsqtGradient,
    rates.psqt,
  );
  updatePsqtRows(
    weights.threatPsqtWeights,
    scratch.whiteFullThreatFeatures,
    activeCounts.whiteFullThreat,
    layerStackIndex,
    whitePsqtGradient,
    rates.psqt,
  );
  updatePsqtRows(
    weights.threatPsqtWeights,
    scratch.blackFullThreatFeatures,
    activeCounts.blackFullThreat,
    layerStackIndex,
    blackPsqtGradient,
    rates.psqt,
  );
};

export const trainNnueRecord = (
  weights: TrainableNnueWeights,
  record: TrainingRecord,
  scratch: NnueTrainingScratch,
  options: NnueTrainingOptions,
): NnueTrainingLoss => {
  const position = generateFenToPosition(normalizeFen(record.fen));
  const trace = forward(weights, position, scratch);
  assertFinite(trace.score, "NNUE prediction", record);

  const target = clamp(
    record.scoreCp,
    -options.targetClamp,
    options.targetClamp,
  );
  assertFinite(target, "NNUE target", record);

  const rawError = trace.score - target;
  assertFinite(rawError, "NNUE raw error", record);

  const gradient = clamp(
    rawError,
    -options.errorClamp,
    options.errorClamp,
  );
  assertFinite(gradient, "NNUE gradient", record);

  backprop(
    weights,
    position,
    scratch,
    trace.layerStackIndex,
    trace.activeCounts,
    gradient,
    options.rates,
  );

  return {
    predicted: trace.score,
    target,
    absoluteError: Math.abs(rawError),
    squaredError: rawError * rawError,
  };
};

export const evaluateTrainableNnueRecord = (
  weights: TrainableNnueWeights,
  record: TrainingRecord,
  scratch: NnueTrainingScratch,
): number => {
  const position = generateFenToPosition(normalizeFen(record.fen));

  return forward(weights, position, scratch).score;
};

export const writeTrainableWeightsToModel = (
  model: NnueModel,
  weights: TrainableNnueWeights,
): NnueModel => ({
  ...model,
  weights: quantizeTrainableNnueWeights(weights),
});
