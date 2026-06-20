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

export type NnueTrainingLossKind = "cp" | "wdl" | "mixed";

export type NnueTrainingOptions = {
  rates: NnueTrainingRates;
  quantizeForward: boolean;
  trainFullThreats: boolean;
  loss: NnueTrainingLossKind;
  targetClamp: number;
  errorClamp: number;
  wdlScale: number;
  wdlGradientScale: number;
  cpLossWeight: number;
  cpHuberDelta: number;
  bucketWeighting: boolean;
};

export type NnueTrainingLoss = {
  predicted: number;
  target: number;
  absoluteError: number;
  squaredError: number;
  loss: number;
  wdlError: number;
  gradient: number;
};

export type NnueOutputCalibration = {
  slope: number;
  intercept: number;
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

const readWeight = (
  value: number,
  min: number,
  max: number,
  quantizeForward: boolean,
): number =>
  quantizeForward ? fakeQuantizeWeight(value, min, max) : clamp(value, min, max);

const divideByWeightScale = (
  value: number,
  quantizeForward: boolean,
): number => {
  const scaled = value / (1 << NNUE_WEIGHT_SCALE_BITS);

  return quantizeForward ? Math.floor(scaled) : scaled;
};

const transformValue = (
  value: number,
  quantizeForward: boolean,
): number => quantizeForward ? Math.trunc(value) : value;

const sigmoid = (value: number): number => {
  if (value >= 40) {
    return 1;
  }

  if (value <= -40) {
    return 0;
  }

  return 1 / (1 + Math.exp(-value));
};

const getHuberLoss = (error: number, delta: number): number => {
  const absError = Math.abs(error);

  if (absError <= delta) {
    return 0.5 * error * error;
  }

  return delta * (absError - 0.5 * delta);
};

const getHuberGradient = (error: number, delta: number): number =>
  clamp(error, -delta, delta);

const getTargetBucketWeight = (absTarget: number): number => {
  if (absTarget < 50) {
    return 0.5;
  }

  if (absTarget < 100) {
    return 0.75;
  }

  if (absTarget < 200) {
    return 1;
  }

  if (absTarget < 500) {
    return 1.5;
  }

  if (absTarget < 1_000) {
    return 2;
  }

  return 2.5;
};

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
  quantizeForward: boolean,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

    for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
      accumulator[i] += readWeight(
        weights[weightIndex++],
        -32_768,
        32_767,
        quantizeForward,
      );
    }
  }
};

const addThreatRowsToAccumulator = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  accumulator: Float32Array,
  quantizeForward: boolean,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

    for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
      accumulator[i] += readWeight(
        weights[weightIndex++],
        -127,
        127,
        quantizeForward,
      );
    }
  }
};

const addPsqtRowsToAccumulator = (
  weights: Float32Array,
  features: Uint32Array,
  featureCount: number,
  accumulator: Float32Array,
  quantizeForward: boolean,
): void => {
  for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
    let weightIndex = features[featureIndex] * NNUE_PSQ_BUCKETS;

    for (let i = 0; i < NNUE_PSQ_BUCKETS; i++) {
      accumulator[i] += readWeight(
        weights[weightIndex++],
        -2_147_483_648,
        2_147_483_647,
        quantizeForward,
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
  quantizeForward: boolean,
): { halfKa: number; fullThreat: number } => {
  for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
    accumulator[i] = readWeight(
      weights.featureBias[i],
      -32_768,
      32_767,
      quantizeForward,
    );
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
    quantizeForward,
  );
  addPsqtRowsToAccumulator(
    weights.psqtWeights,
    halfKaFeatures,
    halfKaCount,
    psqtAccumulator,
    quantizeForward,
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
    quantizeForward,
  );
  addPsqtRowsToAccumulator(
    weights.threatPsqtWeights,
    fullThreatFeatures,
    fullThreatCount,
    psqtAccumulator,
    quantizeForward,
  );

  return { halfKa: halfKaCount, fullThreat: fullThreatCount };
};

const writeFeatureVector = (
  position: Position,
  scratch: NnueTrainingScratch,
  quantizeForward: boolean,
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

    scratch.transformedFeatures[i] = transformValue(
      (usLeft * usRight) / NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
      quantizeForward,
    );
    scratch.transformedFeatures[i + NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE] =
      transformValue(
        (themLeft * themRight) / NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
        quantizeForward,
      );
  }
};

const propagateFc0 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
  quantizeForward: boolean,
): void => {
  for (let output = 0; output < NNUE_FC_0_OUTPUTS_WITH_BUCKET; output++) {
    let sum = readWeight(
      weights.fc0Bias[output],
      -2_147_483_648,
      2_147_483_647,
      quantizeForward,
    );
    let weightIndex = output;

    for (let input = 0; input < NNUE_FEATURE_VECTOR_DIMENSIONS; input++) {
      sum +=
        scratch.transformedFeatures[input] *
        readWeight(
          weights.fc0Weights[weightIndex],
          -127,
          127,
          quantizeForward,
        );
      weightIndex += NNUE_FC_0_OUTPUTS_WITH_BUCKET;
    }

    scratch.fc0Output[output] = divideByWeightScale(sum, quantizeForward);
  }
};

const activateFc0 = (
  scratch: NnueTrainingScratch,
  quantizeForward: boolean,
): void => {
  for (let i = 0; i < NNUE_FC_0_OUTPUTS; i++) {
    const value = clippedRelu(scratch.fc0Output[i], NNUE_HIDDEN_MAX);

    scratch.fc0Activation[i] = transformValue(
      (value * value) / NNUE_HIDDEN_ONE,
      quantizeForward,
    );
    scratch.fc0Activation[i + NNUE_FC_0_OUTPUTS] = value;
  }
};

const propagateFc1 = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
  quantizeForward: boolean,
): void => {
  for (let output = 0; output < NNUE_FC_1_OUTPUTS; output++) {
    let sum = readWeight(
      weights.fc1Bias[output],
      -2_147_483_648,
      2_147_483_647,
      quantizeForward,
    );
    let weightIndex = output;

    for (let input = 0; input < NNUE_FC_0_ACTIVATION_INPUTS; input++) {
      sum +=
        scratch.fc0Activation[input] *
        readWeight(
          weights.fc1Weights[weightIndex],
          -127,
          127,
          quantizeForward,
        );
      weightIndex += NNUE_FC_1_OUTPUTS;
    }

    scratch.fc1Output[output] = divideByWeightScale(sum, quantizeForward);
    scratch.fc1Activation[output] = clippedRelu(
      scratch.fc1Output[output],
      NNUE_HIDDEN_MAX,
    );
  }
};

const getOutputSum = (
  weights: TrainableNnueNetworkWeights,
  scratch: NnueTrainingScratch,
  quantizeForward: boolean,
): number => {
  let sum =
    readWeight(
      weights.fc2Bias[0],
      -2_147_483_648,
      2_147_483_647,
      quantizeForward,
    ) +
    scratch.fc0Output[NNUE_FC_0_OUTPUTS];

  for (let input = 0; input < NNUE_FC_1_OUTPUTS; input++) {
    sum +=
      scratch.fc1Activation[input] *
      readWeight(weights.fc2Weights[input], -127, 127, quantizeForward);
  }

  return sum;
};

const forward = (
  weights: TrainableNnueWeights,
  position: Position,
  scratch: NnueTrainingScratch,
  quantizeForward: boolean,
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
    quantizeForward,
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
    quantizeForward,
  );
  const layerStackIndex = getNnueLayerStackIndex(position);
  const layerStack = weights.layerStacks[layerStackIndex];

  writeFeatureVector(position, scratch, quantizeForward);
  propagateFc0(layerStack, scratch, quantizeForward);
  activateFc0(scratch, quantizeForward);
  propagateFc1(layerStack, scratch, quantizeForward);

  const outputSum = getOutputSum(layerStack, scratch, quantizeForward);
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
  quantizeForward: boolean,
): void => {
  weights.fc2Bias[0] = applyGradient(
    weights.fc2Bias[0],
    gradOutputSum,
    rates.bias,
    -2_147_483_648,
    2_147_483_647,
  );

  for (let input = 0; input < NNUE_FC_1_OUTPUTS; input++) {
    const weight = readWeight(
      weights.fc2Weights[input],
      -127,
      127,
      quantizeForward,
    );

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
  quantizeForward: boolean,
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
      const weight = readWeight(
        weights.fc1Weights[weightIndex],
        -127,
        127,
        quantizeForward,
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
  quantizeForward: boolean,
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
      const weight = readWeight(
        weights.fc0Weights[weightIndex],
        -127,
        127,
        quantizeForward,
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
  quantizeForward: boolean,
  trainFullThreats: boolean,
): void => {
  const layerStack = weights.layerStacks[layerStackIndex];
  const gradOutputSum = gradScore * OUTPUT_SUM_SCORE_SCALE;
  const gradPsqt = gradScore * PSQT_SCORE_SCALE;
  const whitePsqtGradient =
    position.color === COLOR.WHITE ? gradPsqt : -gradPsqt;
  const blackPsqtGradient = -whitePsqtGradient;

  clearGradients(scratch);
  updateFc2(layerStack, scratch, gradOutputSum, rates, quantizeForward);
  scratch.gradFc0Output[NNUE_FC_0_OUTPUTS] += gradOutputSum;
  backpropFc1(layerStack, scratch, rates, quantizeForward);
  backpropFc0Activations(scratch);
  backpropFc0(layerStack, scratch, rates, quantizeForward);
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
  if (trainFullThreats && rates.threat !== 0) {
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
  }
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
  if (trainFullThreats && rates.threat !== 0) {
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
  }
};

const getTrainingLoss = (
  predicted: number,
  target: number,
  options: NnueTrainingOptions,
): {
  rawError: number;
  absoluteError: number;
  squaredError: number;
  loss: number;
  wdlError: number;
  gradient: number;
} => {
  const rawError = predicted - target;
  const predictedWdl = sigmoid(predicted / options.wdlScale);
  const targetWdl = sigmoid(target / options.wdlScale);
  const wdlError = predictedWdl - targetWdl;
  const clampedPredictedWdl = clamp(predictedWdl, 1e-6, 1 - 1e-6);
  const wdlLoss =
    -(targetWdl * Math.log(clampedPredictedWdl)) -
    (1 - targetWdl) * Math.log(1 - clampedPredictedWdl);
  const cpLoss = getHuberLoss(rawError, options.cpHuberDelta);
  const cpGradient = getHuberGradient(rawError, options.cpHuberDelta);
  const wdlGradient = wdlError * options.wdlGradientScale;
  const targetWeight = options.bucketWeighting
    ? getTargetBucketWeight(Math.abs(target))
    : 1;
  let loss: number;
  let gradient: number;

  if (options.loss === "cp") {
    loss = cpLoss;
    gradient = cpGradient;
  } else if (options.loss === "wdl") {
    loss = wdlLoss;
    gradient = wdlGradient;
  } else {
    loss = wdlLoss + options.cpLossWeight * cpLoss;
    gradient = wdlGradient + options.cpLossWeight * cpGradient;
  }

  loss *= targetWeight;
  gradient *= targetWeight;

  return {
    rawError,
    absoluteError: Math.abs(rawError),
    squaredError: rawError * rawError,
    loss,
    wdlError: Math.abs(wdlError),
    gradient: clamp(gradient, -options.errorClamp, options.errorClamp),
  };
};

export const trainNnueRecord = (
  weights: TrainableNnueWeights,
  record: TrainingRecord,
  scratch: NnueTrainingScratch,
  options: NnueTrainingOptions,
): NnueTrainingLoss => {
  const position = generateFenToPosition(normalizeFen(record.fen));
  const trace = forward(weights, position, scratch, options.quantizeForward);
  assertFinite(trace.score, "NNUE prediction", record);

  const target = clamp(
    record.scoreCp,
    -options.targetClamp,
    options.targetClamp,
  );
  assertFinite(target, "NNUE target", record);

  const loss = getTrainingLoss(trace.score, target, options);

  assertFinite(loss.rawError, "NNUE raw error", record);
  assertFinite(loss.gradient, "NNUE gradient", record);
  assertFinite(loss.loss, "NNUE loss", record);

  backprop(
    weights,
    position,
    scratch,
    trace.layerStackIndex,
    trace.activeCounts,
    loss.gradient,
    options.rates,
    options.quantizeForward,
    options.trainFullThreats,
  );

  return {
    predicted: trace.score,
    target,
    absoluteError: loss.absoluteError,
    squaredError: loss.squaredError,
    loss: loss.loss,
    wdlError: loss.wdlError,
    gradient: loss.gradient,
  };
};

export const evaluateTrainableNnueRecord = (
  weights: TrainableNnueWeights,
  record: TrainingRecord,
  scratch: NnueTrainingScratch,
): number => {
  const position = generateFenToPosition(normalizeFen(record.fen));

  return forward(weights, position, scratch, false).score;
};

const scaleFloatArray = (
  values: Float32Array,
  scale: number,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < values.length; i++) {
    values[i] = clamp(values[i] * scale, min, max);
  }
};

export const applyOutputCalibration = (
  weights: TrainableNnueWeights,
  calibration: NnueOutputCalibration,
): void => {
  const interceptOutputSum = calibration.intercept / OUTPUT_SUM_SCORE_SCALE;

  scaleFloatArray(
    weights.psqtWeights,
    calibration.slope,
    -2_147_483_648,
    2_147_483_647,
  );
  scaleFloatArray(
    weights.threatPsqtWeights,
    calibration.slope,
    -2_147_483_648,
    2_147_483_647,
  );

  for (const layerStack of weights.layerStacks) {
    layerStack.fc0Bias[NNUE_FC_0_OUTPUTS] = clamp(
      layerStack.fc0Bias[NNUE_FC_0_OUTPUTS] * calibration.slope,
      -2_147_483_648,
      2_147_483_647,
    );

    for (let input = 0; input < NNUE_FEATURE_VECTOR_DIMENSIONS; input++) {
      const weightIndex =
        input * NNUE_FC_0_OUTPUTS_WITH_BUCKET + NNUE_FC_0_OUTPUTS;

      layerStack.fc0Weights[weightIndex] = clamp(
        layerStack.fc0Weights[weightIndex] * calibration.slope,
        -127,
        127,
      );
    }

    scaleFloatArray(layerStack.fc2Weights, calibration.slope, -127, 127);
    layerStack.fc2Bias[0] = clamp(
      layerStack.fc2Bias[0] * calibration.slope + interceptOutputSum,
      -2_147_483_648,
      2_147_483_647,
    );
  }
};

export const writeTrainableWeightsToModel = (
  model: NnueModel,
  weights: TrainableNnueWeights,
): NnueModel => ({
  ...model,
  weights: quantizeTrainableNnueWeights(weights),
});
