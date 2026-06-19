import { COLOR } from "../../engine/constants/color";
import type { Position } from "../../engine/types/position";
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
  NNUE_LAYER_STACKS,
  NNUE_OUTPUT_SCALE,
  NNUE_TRANSFORMED_FEATURES_PER_PERSPECTIVE,
  NNUE_WEIGHT_SCALE_BITS,
} from "../constants/nnue";
import type {
  NnueAccumulatorStack,
  NnueForwardTrace,
  NnueModel,
  NnueNetworkWeights,
  NnueScratch,
  SearchEvaluator,
} from "../types/nnue";
import {
  addFullThreatAccumulator,
  refreshHalfKaAccumulator,
} from "./accumulator";
import {
  createNnueAccumulatorStack,
  popNnueAccumulatorStack,
  pushNnueAccumulatorStack,
  resetNnueAccumulatorStack,
} from "./accumulatorStack";
import { createNnueScratch } from "./scratch";
import {
  createWasmNnueNetworkForward,
  type NnueNetworkForward,
} from "./wasmInference";

export type NnueEvaluatorBackend = "auto" | "typescript" | "wasm";

export type NnueEvaluatorOptions = {
  backend?: NnueEvaluatorBackend;
};

const clippedRelu = (
  value: number,
  maxValue = NNUE_HIDDEN_MAX,
): number => {
  if (value <= 0) {
    return 0;
  }

  if (value >= maxValue) {
    return maxValue;
  }

  return value;
};

const divideByWeightScale = (value: number): number =>
  Math.floor(value / (1 << NNUE_WEIGHT_SCALE_BITS));

const writeFeatureVector = (
  position: Position,
  scratch: NnueScratch,
  whiteAccumulator: Int32Array,
  blackAccumulator: Int32Array,
): void => {
  const usAccumulator =
    position.color === COLOR.WHITE ? whiteAccumulator : blackAccumulator;
  const themAccumulator =
    position.color === COLOR.WHITE ? blackAccumulator : whiteAccumulator;

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
  weights: NnueNetworkWeights,
  scratch: NnueScratch,
): void => {
  const { fc0Bias, fc0Weights } = weights;
  const sums = scratch.fc0Sums;

  for (let output = 0; output < NNUE_FC_0_OUTPUTS_WITH_BUCKET; output++) {
    sums[output] = fc0Bias[output];
  }

  for (let input = 0; input < NNUE_FEATURE_VECTOR_DIMENSIONS; input++) {
    const value = scratch.transformedFeatures[input];

    if (value === 0) {
      continue;
    }

    let weightIndex = input * NNUE_FC_0_OUTPUTS_WITH_BUCKET;

    for (let output = 0; output < NNUE_FC_0_OUTPUTS_WITH_BUCKET; output++) {
      sums[output] += value * fc0Weights[weightIndex++];
    }
  }

  for (let output = 0; output < NNUE_FC_0_OUTPUTS_WITH_BUCKET; output++) {
    scratch.fc0Output[output] = divideByWeightScale(sums[output]);
  }
};

const activateFc0 = (scratch: NnueScratch): void => {
  for (let i = 0; i < NNUE_FC_0_OUTPUTS; i++) {
    const value = clippedRelu(scratch.fc0Output[i]);

    scratch.fc0Activation[i] = Math.trunc((value * value) / NNUE_HIDDEN_ONE);
    scratch.fc0Activation[i + NNUE_FC_0_OUTPUTS] = value;
  }
};

const propagateFc1 = (
  weights: NnueNetworkWeights,
  scratch: NnueScratch,
): void => {
  const { fc1Bias, fc1Weights } = weights;
  const sums = scratch.fc1Sums;

  for (let output = 0; output < NNUE_FC_1_OUTPUTS; output++) {
    sums[output] = fc1Bias[output];
  }

  for (let input = 0; input < NNUE_FC_0_ACTIVATION_INPUTS; input++) {
    const value = scratch.fc0Activation[input];

    if (value === 0) {
      continue;
    }

    let weightIndex = input * NNUE_FC_1_OUTPUTS;

    for (let output = 0; output < NNUE_FC_1_OUTPUTS; output++) {
      sums[output] += value * fc1Weights[weightIndex++];
    }
  }

  for (let output = 0; output < NNUE_FC_1_OUTPUTS; output++) {
    scratch.fc1Output[output] = divideByWeightScale(sums[output]);
    scratch.fc1Activation[output] = clippedRelu(scratch.fc1Output[output]);
  }
};

const propagateFc2 = (
  weights: NnueNetworkWeights,
  scratch: NnueScratch,
): number => {
  const { fc2Bias, fc2Weights } = weights;
  let sum = fc2Bias[0] + scratch.fc0Output[NNUE_FC_0_OUTPUTS];

  for (let input = 0; input < NNUE_FC_1_OUTPUTS; input++) {
    sum += scratch.fc1Activation[input] * fc2Weights[input];
  }

  const denominator = NNUE_HIDDEN_ONE * (1 << NNUE_WEIGHT_SCALE_BITS) * 2;

  return Math.trunc((sum * 600 * NNUE_OUTPUT_SCALE) / denominator);
};

const countPieces = (position: Position): number => {
  let pieceCount = 0;

  for (let i = 0; i < position.pieceAt.length; i++) {
    if (position.pieceAt[i] !== -1) {
      pieceCount++;
    }
  }

  return pieceCount;
};

export const getNnueLayerStackIndex = (position: Position): number => {
  const bucket = Math.trunc((countPieces(position) - 1) / 4);

  if (bucket <= 0) {
    return 0;
  }

  if (bucket >= NNUE_LAYER_STACKS) {
    return NNUE_LAYER_STACKS - 1;
  }

  return bucket;
};

const evaluateNnueFromAccumulators = (
  model: NnueModel,
  position: Position,
  scratch: NnueScratch,
  whiteAccumulator: Int32Array,
  blackAccumulator: Int32Array,
  whitePsqtAccumulator: Int32Array,
  blackPsqtAccumulator: Int32Array,
  networkForward?: NnueNetworkForward,
): number => {
  const layerStackIndex = getNnueLayerStackIndex(position);
  const layerStack = model.weights.layerStacks[layerStackIndex];
  let evaluationWhiteAccumulator = whiteAccumulator;
  let evaluationBlackAccumulator = blackAccumulator;
  let evaluationWhitePsqtAccumulator = whitePsqtAccumulator;
  let evaluationBlackPsqtAccumulator = blackPsqtAccumulator;

  if (model.metadata.fullThreats !== false) {
    scratch.whiteAccumulator.set(whiteAccumulator);
    scratch.blackAccumulator.set(blackAccumulator);
    scratch.whitePsqtAccumulator.set(whitePsqtAccumulator);
    scratch.blackPsqtAccumulator.set(blackPsqtAccumulator);
    addFullThreatAccumulator(
      model.weights,
      position,
      COLOR.WHITE,
      scratch.fullThreatActiveFeatures,
      scratch.fullThreatAttackScratch,
      scratch.whiteAccumulator,
      scratch.whitePsqtAccumulator,
    );
    addFullThreatAccumulator(
      model.weights,
      position,
      COLOR.BLACK,
      scratch.fullThreatActiveFeatures,
      scratch.fullThreatAttackScratch,
      scratch.blackAccumulator,
      scratch.blackPsqtAccumulator,
    );
    evaluationWhiteAccumulator = scratch.whiteAccumulator;
    evaluationBlackAccumulator = scratch.blackAccumulator;
    evaluationWhitePsqtAccumulator = scratch.whitePsqtAccumulator;
    evaluationBlackPsqtAccumulator = scratch.blackPsqtAccumulator;
  }

  const whitePsqt = evaluationWhitePsqtAccumulator[layerStackIndex];
  const blackPsqt = evaluationBlackPsqtAccumulator[layerStackIndex];
  const psqt =
    position.color === COLOR.WHITE ? whitePsqt - blackPsqt : blackPsqt - whitePsqt;
  const psqtScore = psqt / (2 * NNUE_OUTPUT_SCALE);

  if (model.metadata.network === false) {
    return Math.trunc((125 * psqtScore) / 128);
  }

  let positionalRaw: number;

  if (networkForward !== undefined) {
    positionalRaw = networkForward.forward(
      evaluationWhiteAccumulator,
      evaluationBlackAccumulator,
      position.color,
      layerStackIndex,
    );
  } else {
    writeFeatureVector(
      position,
      scratch,
      evaluationWhiteAccumulator,
      evaluationBlackAccumulator,
    );
    propagateFc0(layerStack, scratch);
    activateFc0(scratch);
    propagateFc1(layerStack, scratch);
    positionalRaw = propagateFc2(layerStack, scratch);
  }

  const positionalScore = positionalRaw / NNUE_OUTPUT_SCALE;

  return Math.trunc((125 * psqtScore + 131 * positionalScore) / 128);
};

export const evaluateNnue = (
  model: NnueModel,
  position: Position,
  scratch: NnueScratch,
): number => {
  refreshHalfKaAccumulator(
    model.weights,
    position,
    COLOR.WHITE,
    scratch.activeFeatures,
    scratch.whiteAccumulator,
    scratch.whitePsqtAccumulator,
  );
  refreshHalfKaAccumulator(
    model.weights,
    position,
    COLOR.BLACK,
    scratch.activeFeatures,
    scratch.blackAccumulator,
    scratch.blackPsqtAccumulator,
  );

  return evaluateNnueFromAccumulators(
    model,
    position,
    scratch,
    scratch.whiteAccumulator,
    scratch.blackAccumulator,
    scratch.whitePsqtAccumulator,
    scratch.blackPsqtAccumulator,
  );
};

export const evaluateNnueWithTrace = (
  model: NnueModel,
  position: Position,
  scratch: NnueScratch,
): NnueForwardTrace => {
  const score = evaluateNnue(model, position, scratch);

  return {
    score,
    layerStackIndex: getNnueLayerStackIndex(position),
    fc1Activation: scratch.fc1Activation,
  };
};

const evaluateNnueFromStack = (
  model: NnueModel,
  position: Position,
  scratch: NnueScratch,
  stack: NnueAccumulatorStack,
  networkForward?: NnueNetworkForward,
): number => {
  const ply = stack.currentPly;

  return evaluateNnueFromAccumulators(
    model,
    position,
    scratch,
    stack.whiteAccumulators[ply],
    stack.blackAccumulators[ply],
    stack.whitePsqtAccumulators[ply],
    stack.blackPsqtAccumulators[ply],
    networkForward,
  );
};

const createNetworkForward = (
  model: NnueModel,
  backend: NnueEvaluatorBackend,
): NnueNetworkForward | undefined => {
  if (backend === "typescript" || model.metadata.network === false) {
    return undefined;
  }

  try {
    return createWasmNnueNetworkForward(model);
  } catch (error) {
    if (backend === "wasm") {
      throw error;
    }

    return undefined;
  }
};

export const createNnueEvaluator = (
  model: NnueModel,
  options: NnueEvaluatorOptions = {},
): SearchEvaluator => {
  const scratch = createNnueScratch();
  const stack = createNnueAccumulatorStack();
  const networkForward = createNetworkForward(
    model,
    options.backend ?? "auto",
  );
  const positionHashStack: bigint[] = [];
  let currentHash: bigint | null = null;

  const reset = (position: Position): void => {
    resetNnueAccumulatorStack(stack, model.weights, position, scratch);
    positionHashStack[0] = position.zobristHash;
    currentHash = position.zobristHash;
  };

  const ensureCurrentPosition = (position: Position): void => {
    if (currentHash !== position.zobristHash) {
      reset(position);
    }
  };

  return {
    evaluate: (position: Position): number => {
      ensureCurrentPosition(position);

      return evaluateNnueFromStack(
        model,
        position,
        scratch,
        stack,
        networkForward,
      );
    },
    reset,
    pushMove: (position, move, undo): void => {
      if (currentHash !== undo.previousZobristHash) {
        reset(position);

        return;
      }

      pushNnueAccumulatorStack(
        stack,
        model.weights,
        position,
        move,
        undo,
        scratch,
      );
      positionHashStack[stack.currentPly] = position.zobristHash;
      currentHash = position.zobristHash;
    },
    popMove: (): void => {
      popNnueAccumulatorStack(stack);
      currentHash = positionHashStack[stack.currentPly] ?? null;
    },
  };
};
