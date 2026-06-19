import "./tfPolyfill";
import * as tf from "@tensorflow/tfjs-node";
import {
  NNUE_FC_0_ACTIVATION_INPUTS,
  NNUE_FC_0_OUTPUTS,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
  NNUE_FEATURE_VECTOR_DIMENSIONS,
  NNUE_FT_MAX,
  NNUE_FULL_THREATS_FEATURE_DIMENSIONS,
  NNUE_HALF_KA_FEATURE_DIMENSIONS,
  NNUE_HIDDEN_MAX,
  NNUE_HIDDEN_ONE,
  NNUE_LAYER_STACKS,
  NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  NNUE_OUTPUT_SCALE,
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE,
  NNUE_WEIGHT_SCALE_BITS,
} from "../../src/search/constants/nnue";
import { createEmptyNnueWeights, createNnueModel } from "../../src/search/nnue/model";
import type {
  NnueModel,
  NnueModelMetadata,
  NnueNetworkWeights,
} from "../../src/search/types/nnue";
import type { FeatureCacheBatch } from "./featureCache";
import { readFeatureCacheBatches, readFeatureCacheHeader } from "./featureCache";

type TensorNnueState = {
  source: NnueModel;
  featureBias: tf.Variable<tf.Rank.R1>;
  featureWeights: tf.Variable<tf.Rank.R2>;
  psqtWeights: tf.Variable<tf.Rank.R2>;
  threatWeights: tf.Variable<tf.Rank.R2> | null;
  threatPsqtWeights: tf.Variable<tf.Rank.R2> | null;
  fc0Bias: tf.Variable<tf.Rank.R2>;
  fc0Weights: tf.Variable<tf.Rank.R3>;
  fc1Bias: tf.Variable<tf.Rank.R2>;
  fc1Weights: tf.Variable<tf.Rank.R3>;
  fc2Bias: tf.Variable<tf.Rank.R2>;
  fc2Weights: tf.Variable<tf.Rank.R2>;
};

type TensorBatch = {
  positions: number;
  targets: tf.Tensor1D;
  sideToMove: tf.Tensor1D;
  layerStacks: tf.Tensor1D;
  whiteHalfKa: tf.Tensor2D;
  blackHalfKa: tf.Tensor2D;
  whiteHalfKaMask: tf.Tensor2D;
  blackHalfKaMask: tf.Tensor2D;
  whiteFullThreats: tf.Tensor2D | null;
  blackFullThreats: tf.Tensor2D | null;
  whiteFullThreatMask: tf.Tensor2D | null;
  blackFullThreatMask: tf.Tensor2D | null;
};

export type TensorTrainingPhase = {
  name: string;
  epochs: number;
  learningRate: number;
  trainFeatureTransformer: boolean;
  trainNetwork: boolean;
  trainPsqt: boolean;
  trainFullThreats: boolean;
  useNetwork: boolean;
  useFullThreats: boolean;
};

export type TensorTrainingEpochSummary = {
  phase: string;
  epoch: number;
  positions: number;
  batches: number;
  meanLoss: number;
  positionsPerSecond: number;
};

export type TensorTrainingOptions = {
  batchSize: number;
  seed: number;
  targetClamp: number;
  loss: "cp" | "wdl" | "mixed";
  wdlScale: number;
  wdlGradientScale: number;
  cpLossWeight: number;
  cpHuberDelta: number;
  bucketWeighting: boolean;
  phases: TensorTrainingPhase[];
  logEvery: number;
  onProgress?: (summary: {
    phase: string;
    epoch: number;
    positions: number;
    totalPositions: number;
    meanLoss: number;
    positionsPerSecond: number;
  }) => void;
};

const POSITIONAL_SCORE_SCALE =
  600 /
  (NNUE_HIDDEN_ONE * (1 << NNUE_WEIGHT_SCALE_BITS) * 2);
const PSQT_SCORE_SCALE = 1 / (2 * NNUE_OUTPUT_SCALE);

const tensorVariable = <R extends tf.Rank>(
  values: Int8Array | Int16Array | Int32Array | Float32Array,
  shape: number[],
  name: string,
): tf.Variable<R> => {
  const tensorValues =
    values instanceof Int8Array || values instanceof Int16Array
      ? Float32Array.from(values)
      : values;
  const tensor = tf.tensor(
    tensorValues,
    shape as never,
    "float32",
  ) as tf.Tensor<R>;
  const variable = tf.variable(tensor, true, name);

  tensor.dispose();

  return variable;
};

const stackNetworkValues = (
  layerStacks: NnueNetworkWeights[],
  select: (weights: NnueNetworkWeights) =>
    | Int8Array
    | Int32Array,
): Float32Array => {
  const first = select(layerStacks[0]);
  const output = new Float32Array(first.length * layerStacks.length);

  for (let i = 0; i < layerStacks.length; i++) {
    output.set(select(layerStacks[i]), i * first.length);
  }

  return output;
};

export const createTensorNnueState = (
  model: NnueModel,
  includeFullThreats: boolean,
): TensorNnueState => ({
  source: model,
  featureBias: tensorVariable(
    model.weights.featureBias,
    [NNUE_TRANSFORMED_FEATURE_DIMENSIONS],
    "featureBias",
  ),
  featureWeights: tensorVariable(
    model.weights.featureWeights,
    [NNUE_HALF_KA_FEATURE_DIMENSIONS, NNUE_TRANSFORMED_FEATURE_DIMENSIONS],
    "featureWeights",
  ),
  psqtWeights: tensorVariable(
    model.weights.psqtWeights,
    [NNUE_HALF_KA_FEATURE_DIMENSIONS, NNUE_PSQ_BUCKETS],
    "psqtWeights",
  ),
  threatWeights: includeFullThreats
    ? tensorVariable(
        model.weights.threatWeights,
        [
          NNUE_FULL_THREATS_FEATURE_DIMENSIONS,
          NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
        ],
        "threatWeights",
      )
    : null,
  threatPsqtWeights: includeFullThreats
    ? tensorVariable(
        model.weights.threatPsqtWeights,
        [NNUE_FULL_THREATS_FEATURE_DIMENSIONS, NNUE_PSQ_BUCKETS],
        "threatPsqtWeights",
      )
    : null,
  fc0Bias: tensorVariable(
    stackNetworkValues(model.weights.layerStacks, (weights) => weights.fc0Bias),
    [NNUE_LAYER_STACKS, NNUE_FC_0_OUTPUTS_WITH_BUCKET],
    "fc0Bias",
  ),
  fc0Weights: tensorVariable(
    stackNetworkValues(
      model.weights.layerStacks,
      (weights) => weights.fc0Weights,
    ),
    [
      NNUE_LAYER_STACKS,
      NNUE_FEATURE_VECTOR_DIMENSIONS,
      NNUE_FC_0_OUTPUTS_WITH_BUCKET,
    ],
    "fc0Weights",
  ),
  fc1Bias: tensorVariable(
    stackNetworkValues(model.weights.layerStacks, (weights) => weights.fc1Bias),
    [NNUE_LAYER_STACKS, NNUE_FC_1_OUTPUTS],
    "fc1Bias",
  ),
  fc1Weights: tensorVariable(
    stackNetworkValues(
      model.weights.layerStacks,
      (weights) => weights.fc1Weights,
    ),
    [NNUE_LAYER_STACKS, NNUE_FC_0_ACTIVATION_INPUTS, NNUE_FC_1_OUTPUTS],
    "fc1Weights",
  ),
  fc2Bias: tensorVariable(
    stackNetworkValues(model.weights.layerStacks, (weights) => weights.fc2Bias),
    [NNUE_LAYER_STACKS, 1],
    "fc2Bias",
  ),
  fc2Weights: tensorVariable(
    stackNetworkValues(
      model.weights.layerStacks,
      (weights) => weights.fc2Weights,
    ),
    [NNUE_LAYER_STACKS, NNUE_FC_1_OUTPUTS],
    "fc2Weights",
  ),
});

const createTensorBatch = (batch: FeatureCacheBatch): TensorBatch => ({
  positions: batch.positions,
  targets: tf.tensor1d(batch.targets, "float32"),
  sideToMove: tf.tensor1d(batch.sideToMove, "float32"),
  layerStacks: tf.tensor1d(batch.layerStacks, "int32"),
  whiteHalfKa: tf.tensor2d(
    batch.whiteHalfKa,
    [batch.positions, NNUE_MAX_ACTIVE_HALF_KA_FEATURES],
    "int32",
  ),
  blackHalfKa: tf.tensor2d(
    batch.blackHalfKa,
    [batch.positions, NNUE_MAX_ACTIVE_HALF_KA_FEATURES],
    "int32",
  ),
  whiteHalfKaMask: tf.tensor2d(batch.whiteHalfKaMask, [
    batch.positions,
    NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  ]),
  blackHalfKaMask: tf.tensor2d(batch.blackHalfKaMask, [
    batch.positions,
    NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  ]),
  whiteFullThreats:
    batch.whiteFullThreats === null
      ? null
      : tf.tensor2d(
          batch.whiteFullThreats,
          [batch.positions, NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES],
          "int32",
        ),
  blackFullThreats:
    batch.blackFullThreats === null
      ? null
      : tf.tensor2d(
          batch.blackFullThreats,
          [batch.positions, NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES],
          "int32",
        ),
  whiteFullThreatMask:
    batch.whiteFullThreatMask === null
      ? null
      : tf.tensor2d(batch.whiteFullThreatMask, [
          batch.positions,
          NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
        ]),
  blackFullThreatMask:
    batch.blackFullThreatMask === null
      ? null
      : tf.tensor2d(batch.blackFullThreatMask, [
          batch.positions,
          NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
        ]),
});

const disposeTensorBatch = (batch: TensorBatch): void => {
  batch.targets.dispose();
  batch.sideToMove.dispose();
  batch.layerStacks.dispose();
  batch.whiteHalfKa.dispose();
  batch.blackHalfKa.dispose();
  batch.whiteHalfKaMask.dispose();
  batch.blackHalfKaMask.dispose();
  batch.whiteFullThreats?.dispose();
  batch.blackFullThreats?.dispose();
  batch.whiteFullThreatMask?.dispose();
  batch.blackFullThreatMask?.dispose();
};

const sumActiveRows = (
  weights: tf.Tensor2D,
  indices: tf.Tensor2D,
  mask: tf.Tensor2D,
): tf.Tensor2D =>
  tf.sum(
    tf.mul(tf.gather(weights, indices), tf.expandDims(mask, 2)),
    1,
  ) as tf.Tensor2D;

const selectBucket = (
  values: tf.Tensor2D,
  layerStacks: tf.Tensor1D,
): tf.Tensor1D =>
  tf.sum(
    tf.mul(values, tf.oneHot(layerStacks, NNUE_PSQ_BUCKETS)),
    1,
  ) as tf.Tensor1D;

const writeFeatureVector = (
  whiteAccumulator: tf.Tensor2D,
  blackAccumulator: tf.Tensor2D,
  sideToMove: tf.Tensor1D,
  quantized: boolean,
): tf.Tensor2D => {
  const transform = (accumulator: tf.Tensor2D): tf.Tensor2D => {
    const left = tf.clipByValue(
      accumulator.slice([0, 0], [-1, NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE]),
      0,
      NNUE_FT_MAX,
    );
    const right = tf.clipByValue(
      accumulator.slice(
        [0, NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE],
        [-1, NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE],
      ),
      0,
      NNUE_FT_MAX,
    );
    const transformed = tf.div(
      tf.mul(left, right),
      NNUE_FEATURE_TRANSFORMER_PRODUCT_DENOMINATOR,
    );

    return (quantized ? tf.floor(transformed) : transformed) as tf.Tensor2D;
  };
  const white = transform(whiteAccumulator);
  const black = transform(blackAccumulator);
  const whiteFactor = tf.expandDims(tf.div(tf.add(sideToMove, 1), 2), 1);
  const blackFactor = tf.sub(1, whiteFactor);
  const us = tf.add(tf.mul(white, whiteFactor), tf.mul(black, blackFactor));
  const them = tf.add(tf.mul(black, whiteFactor), tf.mul(white, blackFactor));

  return tf.concat([us, them], 1) as tf.Tensor2D;
};

export const tensorForward = (
  state: TensorNnueState,
  batch: TensorBatch,
  options: { useNetwork: boolean; useFullThreats: boolean; quantized: boolean },
): tf.Tensor1D => {
  const whitePsqt = sumActiveRows(
    state.psqtWeights,
    batch.whiteHalfKa,
    batch.whiteHalfKaMask,
  );
  const blackPsqt = sumActiveRows(
    state.psqtWeights,
    batch.blackHalfKa,
    batch.blackHalfKaMask,
  );
  let finalWhitePsqt = whitePsqt;
  let finalBlackPsqt = blackPsqt;

  if (options.useFullThreats) {
    if (
      state.threatPsqtWeights === null ||
      batch.whiteFullThreats === null ||
      batch.blackFullThreats === null ||
      batch.whiteFullThreatMask === null ||
      batch.blackFullThreatMask === null
    ) {
      throw new Error("FullThreat tensor data was not loaded");
    }

    finalWhitePsqt = tf.add(
      finalWhitePsqt,
      sumActiveRows(
        state.threatPsqtWeights,
        batch.whiteFullThreats,
        batch.whiteFullThreatMask,
      ),
    );
    finalBlackPsqt = tf.add(
      finalBlackPsqt,
      sumActiveRows(
        state.threatPsqtWeights,
        batch.blackFullThreats,
        batch.blackFullThreatMask,
      ),
    );
  }

  const psqtDifference = tf.mul(
    tf.sub(
      selectBucket(finalWhitePsqt, batch.layerStacks),
      selectBucket(finalBlackPsqt, batch.layerStacks),
    ),
    batch.sideToMove,
  );
  const psqtScore = tf.mul(psqtDifference, PSQT_SCORE_SCALE);
  let positionalScore = tf.zerosLike(psqtScore);

  if (options.useNetwork) {
    let whiteAccumulator = tf.add(
      sumActiveRows(
        state.featureWeights,
        batch.whiteHalfKa,
        batch.whiteHalfKaMask,
      ),
      state.featureBias,
    ) as tf.Tensor2D;
    let blackAccumulator = tf.add(
      sumActiveRows(
        state.featureWeights,
        batch.blackHalfKa,
        batch.blackHalfKaMask,
      ),
      state.featureBias,
    ) as tf.Tensor2D;

    if (options.useFullThreats) {
      if (
        state.threatWeights === null ||
        batch.whiteFullThreats === null ||
        batch.blackFullThreats === null ||
        batch.whiteFullThreatMask === null ||
        batch.blackFullThreatMask === null
      ) {
        throw new Error("FullThreat tensor data was not loaded");
      }

      whiteAccumulator = tf.add(
        whiteAccumulator,
        sumActiveRows(
          state.threatWeights,
          batch.whiteFullThreats,
          batch.whiteFullThreatMask,
        ),
      ) as tf.Tensor2D;
      blackAccumulator = tf.add(
        blackAccumulator,
        sumActiveRows(
          state.threatWeights,
          batch.blackFullThreats,
          batch.blackFullThreatMask,
        ),
      ) as tf.Tensor2D;
    }

    const features = writeFeatureVector(
      whiteAccumulator,
      blackAccumulator,
      batch.sideToMove,
      options.quantized,
    );
    const fc0Weights = tf.gather(state.fc0Weights, batch.layerStacks);
    const fc0Bias = tf.gather(state.fc0Bias, batch.layerStacks);
    let fc0Output = tf.div(
      tf.add(
        tf.squeeze(
          tf.matMul(tf.expandDims(features, 1), fc0Weights),
          [1],
        ),
        fc0Bias,
      ),
      1 << NNUE_WEIGHT_SCALE_BITS,
    );

    if (options.quantized) {
      fc0Output = tf.floor(fc0Output);
    }

    const fc0Hidden = tf.clipByValue(
      fc0Output.slice([0, 0], [-1, NNUE_FC_0_OUTPUTS]),
      0,
      NNUE_HIDDEN_MAX,
    );
    const squaredActivation = tf.div(tf.square(fc0Hidden), NNUE_HIDDEN_ONE);
    const fc0Activation = tf.concat(
      [options.quantized ? tf.floor(squaredActivation) : squaredActivation, fc0Hidden],
      1,
    );
    const fc1Weights = tf.gather(state.fc1Weights, batch.layerStacks);
    const fc1Bias = tf.gather(state.fc1Bias, batch.layerStacks);
    let fc1Output = tf.div(
      tf.add(
        tf.squeeze(
          tf.matMul(tf.expandDims(fc0Activation, 1), fc1Weights),
          [1],
        ),
        fc1Bias,
      ),
      1 << NNUE_WEIGHT_SCALE_BITS,
    );

    if (options.quantized) {
      fc1Output = tf.floor(fc1Output);
    }

    const fc1Activation = tf.clipByValue(fc1Output, 0, NNUE_HIDDEN_MAX);
    const fc2Weights = tf.gather(state.fc2Weights, batch.layerStacks);
    const fc2Bias = tf.squeeze(
      tf.gather(state.fc2Bias, batch.layerStacks),
      [1],
    );
    const outputSum = tf.addN([
      tf.sum(tf.mul(fc1Activation, fc2Weights), 1),
      fc2Bias,
      tf.squeeze(
        fc0Output.slice([0, NNUE_FC_0_OUTPUTS], [-1, 1]),
        [1],
      ),
    ]);

    positionalScore = tf.mul(outputSum, POSITIONAL_SCORE_SCALE);
  }

  const score = tf.div(
    tf.add(tf.mul(psqtScore, 125), tf.mul(positionalScore, 131)),
    128,
  );

  return (options.quantized
    ? tf.mul(tf.sign(score), tf.floor(tf.abs(score)))
    : score) as tf.Tensor1D;
};

const getTargetWeights = (
  targets: tf.Tensor1D,
  enabled: boolean,
): tf.Tensor1D => {
  if (!enabled) {
    return tf.onesLike(targets);
  }

  const absolute = tf.abs(targets);

  return tf.where(
    tf.less(absolute, 200),
    tf.onesLike(absolute),
    tf.where(
      tf.less(absolute, 500),
      tf.fill(absolute.shape, 1.1),
      tf.where(
        tf.less(absolute, 1_000),
        tf.fill(absolute.shape, 1.2),
        tf.fill(absolute.shape, 1.25),
      ),
    ),
  ) as tf.Tensor1D;
};

const getLoss = (
  predictions: tf.Tensor1D,
  targets: tf.Tensor1D,
  options: TensorTrainingOptions,
): tf.Scalar => {
  const clampedTargets = tf.clipByValue(
    targets,
    -options.targetClamp,
    options.targetClamp,
  );
  const error = tf.sub(predictions, clampedTargets);
  const absoluteError = tf.abs(error);
  const quadraticError = tf.minimum(absoluteError, options.cpHuberDelta);
  const cpLoss = tf.add(
    tf.mul(0.5, tf.square(quadraticError)),
    tf.mul(
      options.cpHuberDelta,
      tf.sub(absoluteError, quadraticError),
    ),
  );
  const predictionLogits = tf.div(predictions, options.wdlScale);
  const targetWdl = tf.sigmoid(tf.div(clampedTargets, options.wdlScale));
  const wdlLoss = tf.mul(
    tf.sub(tf.softplus(predictionLogits), tf.mul(targetWdl, predictionLogits)),
    options.wdlGradientScale * options.wdlScale,
  );
  let combined: tf.Tensor;

  if (options.loss === "cp") {
    combined = cpLoss;
  } else if (options.loss === "wdl") {
    combined = wdlLoss;
  } else {
    combined = tf.add(wdlLoss, tf.mul(cpLoss, options.cpLossWeight));
  }

  return tf.mean(
    tf.mul(combined, getTargetWeights(clampedTargets, options.bucketWeighting)),
  ) as tf.Scalar;
};

const getPhaseVariables = (
  state: TensorNnueState,
  phase: TensorTrainingPhase,
): tf.Variable[] => {
  const variables: tf.Variable[] = [];

  if (phase.trainPsqt) {
    variables.push(state.psqtWeights);
  }

  if (phase.trainFeatureTransformer) {
    variables.push(state.featureBias, state.featureWeights);
  }

  if (phase.trainNetwork) {
    variables.push(
      state.fc0Bias,
      state.fc0Weights,
      state.fc1Bias,
      state.fc1Weights,
      state.fc2Bias,
      state.fc2Weights,
    );
  }

  if (phase.trainFullThreats) {
    if (state.threatWeights === null || state.threatPsqtWeights === null) {
      throw new Error("FullThreat weights were not loaded");
    }

    variables.push(state.threatWeights, state.threatPsqtWeights);
  }

  return variables;
};

const disposeTensorNnueState = (state: TensorNnueState): void => {
  state.featureBias.dispose();
  state.featureWeights.dispose();
  state.psqtWeights.dispose();
  state.threatWeights?.dispose();
  state.threatPsqtWeights?.dispose();
  state.fc0Bias.dispose();
  state.fc0Weights.dispose();
  state.fc1Bias.dispose();
  state.fc1Weights.dispose();
  state.fc2Bias.dispose();
  state.fc2Weights.dispose();
};

const copyQuantized = (
  source: Float32Array,
  target: Int8Array | Int16Array | Int32Array,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < target.length; i++) {
    target[i] = Math.round(Math.min(max, Math.max(min, source[i])));
  }
};

const copyNetworkSlice = (
  source: Float32Array,
  sourceOffset: number,
  target: Int8Array | Int32Array,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < target.length; i++) {
    target[i] = Math.round(
      Math.min(max, Math.max(min, source[sourceOffset + i])),
    );
  }
};

const exportTensorNnueState = async (
  state: TensorNnueState,
  metadata: NnueModelMetadata,
): Promise<NnueModel> => {
  const weights = createEmptyNnueWeights();
  const [
    featureBias,
    featureWeights,
    psqtWeights,
    fc0Bias,
    fc0Weights,
    fc1Bias,
    fc1Weights,
    fc2Bias,
    fc2Weights,
  ] = await Promise.all([
    state.featureBias.data(),
    state.featureWeights.data(),
    state.psqtWeights.data(),
    state.fc0Bias.data(),
    state.fc0Weights.data(),
    state.fc1Bias.data(),
    state.fc1Weights.data(),
    state.fc2Bias.data(),
    state.fc2Weights.data(),
  ]);

  copyQuantized(featureBias as Float32Array, weights.featureBias, -32_768, 32_767);
  copyQuantized(
    featureWeights as Float32Array,
    weights.featureWeights,
    -32_768,
    32_767,
  );
  copyQuantized(
    psqtWeights as Float32Array,
    weights.psqtWeights,
    -2_147_483_648,
    2_147_483_647,
  );

  if (state.threatWeights === null || state.threatPsqtWeights === null) {
    weights.threatWeights.set(state.source.weights.threatWeights);
    weights.threatPsqtWeights.set(state.source.weights.threatPsqtWeights);
  } else {
    copyQuantized(
      (await state.threatWeights.data()) as Float32Array,
      weights.threatWeights,
      -127,
      127,
    );
    copyQuantized(
      (await state.threatPsqtWeights.data()) as Float32Array,
      weights.threatPsqtWeights,
      -2_147_483_648,
      2_147_483_647,
    );
  }

  const networkSources = [
    fc0Bias,
    fc0Weights,
    fc1Bias,
    fc1Weights,
    fc2Bias,
    fc2Weights,
  ] as Float32Array[];
  const networkTargets = weights.layerStacks.map((layerStack) => [
    layerStack.fc0Bias,
    layerStack.fc0Weights,
    layerStack.fc1Bias,
    layerStack.fc1Weights,
    layerStack.fc2Bias,
    layerStack.fc2Weights,
  ]);

  for (let stackIndex = 0; stackIndex < NNUE_LAYER_STACKS; stackIndex++) {
    for (let valueIndex = 0; valueIndex < networkSources.length; valueIndex++) {
      const target = networkTargets[stackIndex][valueIndex];
      const source = networkSources[valueIndex];
      const min = target instanceof Int8Array ? -127 : -2_147_483_648;
      const max = target instanceof Int8Array ? 127 : 2_147_483_647;

      copyNetworkSlice(
        source,
        stackIndex * target.length,
        target,
        min,
        max,
      );
    }
  }

  return createNnueModel(metadata, weights);
};

export const predictTensorNnueBatch = (
  model: NnueModel,
  batch: FeatureCacheBatch,
  options: { useFullThreats: boolean; quantized: boolean },
): Float32Array => {
  const state = createTensorNnueState(model, options.useFullThreats);
  const tensors = createTensorBatch(batch);

  try {
    return tf.tidy(() =>
      tensorForward(state, tensors, {
        useNetwork: true,
        useFullThreats: options.useFullThreats,
        quantized: options.quantized,
      }).dataSync(),
    ) as Float32Array;
  } finally {
    disposeTensorBatch(tensors);
    disposeTensorNnueState(state);
  }
};

export const trainTensorNnue = async (
  model: NnueModel,
  cachePath: string,
  metadata: NnueModelMetadata,
  options: TensorTrainingOptions,
): Promise<{
  model: NnueModel;
  epochs: TensorTrainingEpochSummary[];
}> => {
  const cache = await readFeatureCacheHeader(cachePath);
  const includeFullThreats = options.phases.some(
    (phase) => phase.useFullThreats || phase.trainFullThreats,
  );

  if (includeFullThreats && !cache.includeFullThreats) {
    throw new Error("Training phases require a FullThreat feature cache");
  }

  const state = createTensorNnueState(model, includeFullThreats);
  const epochSummaries: TensorTrainingEpochSummary[] = [];

  try {
    for (let phaseIndex = 0; phaseIndex < options.phases.length; phaseIndex++) {
      const phase = options.phases[phaseIndex];
      const variables = getPhaseVariables(state, phase);

      if (variables.length === 0) {
        throw new Error(`Tensor phase ${phase.name} has no trainable weights`);
      }

      const optimizer = tf.train.adam(phase.learningRate);

      try {
        for (let epoch = 1; epoch <= phase.epochs; epoch++) {
          const startedAt = Date.now();
          let positions = 0;
          let batches = 0;
          let weightedLoss = 0;
          let nextLog = options.logEvery;

          for await (const cachedBatch of readFeatureCacheBatches(cachePath, {
            batchSize: options.batchSize,
            shuffleSeed:
              options.seed + phaseIndex * 10_000 + epoch * 1_000,
          })) {
            const batch = createTensorBatch(cachedBatch);

            try {
              const loss = optimizer.minimize(
                () =>
                  tf.tidy(() =>
                    getLoss(
                      tensorForward(state, batch, {
                        useNetwork: phase.useNetwork,
                        useFullThreats: phase.useFullThreats,
                        quantized: false,
                      }),
                      batch.targets,
                      options,
                    ),
                  ),
                true,
                variables,
              );

              if (loss === null) {
                throw new Error(`Tensor phase ${phase.name} produced no loss`);
              }

              const lossValue = loss.dataSync()[0];

              loss.dispose();
              positions += cachedBatch.positions;
              batches++;
              weightedLoss += lossValue * cachedBatch.positions;
            } finally {
              disposeTensorBatch(batch);
            }

            if (positions >= nextLog || positions === cache.positions) {
              const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1_000);

              options.onProgress?.({
                phase: phase.name,
                epoch,
                positions,
                totalPositions: cache.positions,
                meanLoss: weightedLoss / positions,
                positionsPerSecond: positions / elapsedSeconds,
              });
              nextLog += options.logEvery;
            }
          }

          const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1_000);

          epochSummaries.push({
            phase: phase.name,
            epoch,
            positions,
            batches,
            meanLoss: weightedLoss / positions,
            positionsPerSecond: positions / elapsedSeconds,
          });
        }
      } finally {
        optimizer.dispose();
      }
    }

    return {
      model: await exportTensorNnueState(state, {
        ...metadata,
        fullThreats: includeFullThreats
          ? true
          : model.metadata.fullThreats,
        network: options.phases.some((phase) => phase.useNetwork)
          ? true
          : model.metadata.network,
      }),
      epochs: epochSummaries,
    };
  } finally {
    disposeTensorNnueState(state);
  }
};
