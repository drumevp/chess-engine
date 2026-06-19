const COLOR_WHITE: i32 = 0;

const TRANSFORMED_DIMENSIONS: i32 = 1024;
const FEATURES_PER_PERSPECTIVE: i32 = 512;
const FC0_OUTPUTS: i32 = 31;
const FC0_OUTPUTS_WITH_BUCKET: i32 = 32;
const FC0_ACTIVATION_INPUTS: i32 = 62;
const FC1_OUTPUTS: i32 = 32;
const LAYER_STACKS: i32 = 8;

const FT_MAX: i32 = 255;
const HIDDEN_ONE: i32 = 128;
const HIDDEN_MAX: i32 = 127;
const FEATURE_PRODUCT_SHIFT: i32 = 9;
const WEIGHT_SCALE_SHIFT: i32 = 6;

const FC0_WEIGHT_COUNT: i32 =
  TRANSFORMED_DIMENSIONS * FC0_OUTPUTS_WITH_BUCKET;
const FC1_WEIGHT_COUNT: i32 = FC0_ACTIVATION_INPUTS * FC1_OUTPUTS;

const WHITE_ACCUMULATOR = memory.data(TRANSFORMED_DIMENSIONS << 2, 16);
const BLACK_ACCUMULATOR = memory.data(TRANSFORMED_DIMENSIONS << 2, 16);
const FC0_BIASES = memory.data(LAYER_STACKS * FC0_OUTPUTS_WITH_BUCKET << 2, 16);
const FC0_WEIGHTS = memory.data(LAYER_STACKS * FC0_WEIGHT_COUNT, 16);
const FC1_BIASES = memory.data(LAYER_STACKS * FC1_OUTPUTS << 2, 16);
const FC1_WEIGHTS = memory.data(LAYER_STACKS * FC1_WEIGHT_COUNT, 16);
const FC2_BIASES = memory.data(LAYER_STACKS << 2, 16);
const FC2_WEIGHTS = memory.data(LAYER_STACKS * FC1_OUTPUTS, 16);

const TRANSFORMED_FEATURES = memory.data(TRANSFORMED_DIMENSIONS, 16);
const FC0_VALUES = memory.data(FC0_OUTPUTS_WITH_BUCKET << 2, 16);
const FC0_ACTIVATIONS = memory.data(FC0_ACTIVATION_INPUTS, 16);
const FC1_SUMS = memory.data(FC1_OUTPUTS << 2, 16);
const FC1_ACTIVATIONS = memory.data(FC1_OUTPUTS, 16);

export function getWhiteAccumulatorPointer(): usize {
  return WHITE_ACCUMULATOR;
}

export function getBlackAccumulatorPointer(): usize {
  return BLACK_ACCUMULATOR;
}

export function getFc0BiasPointer(): usize {
  return FC0_BIASES;
}

export function getFc0WeightPointer(): usize {
  return FC0_WEIGHTS;
}

export function getFc1BiasPointer(): usize {
  return FC1_BIASES;
}

export function getFc1WeightPointer(): usize {
  return FC1_WEIGHTS;
}

export function getFc2BiasPointer(): usize {
  return FC2_BIASES;
}

export function getFc2WeightPointer(): usize {
  return FC2_WEIGHTS;
}

@inline
function clippedRelu(value: i32, maximum: i32): i32 {
  if (value <= 0) {
    return 0;
  }

  return value >= maximum ? maximum : value;
}

function writeFeatureVector(sideToMove: i32): void {
  const us = sideToMove === COLOR_WHITE ? WHITE_ACCUMULATOR : BLACK_ACCUMULATOR;
  const them = sideToMove === COLOR_WHITE ? BLACK_ACCUMULATOR : WHITE_ACCUMULATOR;

  for (let i: i32 = 0; i < FEATURES_PER_PERSPECTIVE; i++) {
    const rightOffset = (i + FEATURES_PER_PERSPECTIVE) << 2;
    const usLeft = clippedRelu(load<i32>(us + (i << 2)), FT_MAX);
    const usRight = clippedRelu(load<i32>(us + rightOffset), FT_MAX);
    const themLeft = clippedRelu(load<i32>(them + (i << 2)), FT_MAX);
    const themRight = clippedRelu(load<i32>(them + rightOffset), FT_MAX);

    store<u8>(
      TRANSFORMED_FEATURES + i,
      <u8>((usLeft * usRight) >> FEATURE_PRODUCT_SHIFT),
    );
    store<u8>(
      TRANSFORMED_FEATURES + i + FEATURES_PER_PERSPECTIVE,
      <u8>((themLeft * themRight) >> FEATURE_PRODUCT_SHIFT),
    );
  }
}

function propagateFc0(layerStackIndex: i32): void {
  const biasBase =
    FC0_BIASES + layerStackIndex * FC0_OUTPUTS_WITH_BUCKET * sizeof<i32>();
  const weightBase = FC0_WEIGHTS + layerStackIndex * FC0_WEIGHT_COUNT;
  let sum0 = v128.load(biasBase, 0);
  let sum1 = v128.load(biasBase, 16);
  let sum2 = v128.load(biasBase, 32);
  let sum3 = v128.load(biasBase, 48);
  let sum4 = v128.load(biasBase, 64);
  let sum5 = v128.load(biasBase, 80);
  let sum6 = v128.load(biasBase, 96);
  let sum7 = v128.load(biasBase, 112);

  for (let input: i32 = 0; input < TRANSFORMED_DIMENSIONS; input++) {
    const value = <i32>load<u8>(TRANSFORMED_FEATURES + input);

    if (value === 0) {
      continue;
    }

    const inputWeightBase = weightBase + input * FC0_OUTPUTS_WITH_BUCKET;
    const valueVector = i16x8.splat(<i16>value);
    const weightsLow = v128.load(inputWeightBase);
    const weightsHigh = v128.load(inputWeightBase, 16);
    const product0 = i16x8.mul(
      valueVector,
      i16x8.extend_low_i8x16_s(weightsLow),
    );
    const product1 = i16x8.mul(
      valueVector,
      i16x8.extend_high_i8x16_s(weightsLow),
    );
    const product2 = i16x8.mul(
      valueVector,
      i16x8.extend_low_i8x16_s(weightsHigh),
    );
    const product3 = i16x8.mul(
      valueVector,
      i16x8.extend_high_i8x16_s(weightsHigh),
    );

    sum0 = i32x4.add(sum0, i32x4.extend_low_i16x8_s(product0));
    sum1 = i32x4.add(sum1, i32x4.extend_high_i16x8_s(product0));
    sum2 = i32x4.add(sum2, i32x4.extend_low_i16x8_s(product1));
    sum3 = i32x4.add(sum3, i32x4.extend_high_i16x8_s(product1));
    sum4 = i32x4.add(sum4, i32x4.extend_low_i16x8_s(product2));
    sum5 = i32x4.add(sum5, i32x4.extend_high_i16x8_s(product2));
    sum6 = i32x4.add(sum6, i32x4.extend_low_i16x8_s(product3));
    sum7 = i32x4.add(sum7, i32x4.extend_high_i16x8_s(product3));
  }

  v128.store(FC0_VALUES, i32x4.shr_s(sum0, WEIGHT_SCALE_SHIFT), 0);
  v128.store(FC0_VALUES, i32x4.shr_s(sum1, WEIGHT_SCALE_SHIFT), 16);
  v128.store(FC0_VALUES, i32x4.shr_s(sum2, WEIGHT_SCALE_SHIFT), 32);
  v128.store(FC0_VALUES, i32x4.shr_s(sum3, WEIGHT_SCALE_SHIFT), 48);
  v128.store(FC0_VALUES, i32x4.shr_s(sum4, WEIGHT_SCALE_SHIFT), 64);
  v128.store(FC0_VALUES, i32x4.shr_s(sum5, WEIGHT_SCALE_SHIFT), 80);
  v128.store(FC0_VALUES, i32x4.shr_s(sum6, WEIGHT_SCALE_SHIFT), 96);
  v128.store(FC0_VALUES, i32x4.shr_s(sum7, WEIGHT_SCALE_SHIFT), 112);
}

function activateFc0(): void {
  for (let i: i32 = 0; i < FC0_OUTPUTS; i++) {
    const value = clippedRelu(load<i32>(FC0_VALUES + (i << 2)), HIDDEN_MAX);

    store<u8>(FC0_ACTIVATIONS + i, <u8>((value * value) / HIDDEN_ONE));
    store<u8>(FC0_ACTIVATIONS + i + FC0_OUTPUTS, <u8>value);
  }
}

function propagateFc1(layerStackIndex: i32): void {
  const biasBase = FC1_BIASES + layerStackIndex * FC1_OUTPUTS * sizeof<i32>();
  const weightBase = FC1_WEIGHTS + layerStackIndex * FC1_WEIGHT_COUNT;
  let sum0 = v128.load(biasBase, 0);
  let sum1 = v128.load(biasBase, 16);
  let sum2 = v128.load(biasBase, 32);
  let sum3 = v128.load(biasBase, 48);
  let sum4 = v128.load(biasBase, 64);
  let sum5 = v128.load(biasBase, 80);
  let sum6 = v128.load(biasBase, 96);
  let sum7 = v128.load(biasBase, 112);

  for (let input: i32 = 0; input < FC0_ACTIVATION_INPUTS; input++) {
    const value = <i32>load<u8>(FC0_ACTIVATIONS + input);

    if (value === 0) {
      continue;
    }

    const inputWeightBase = weightBase + input * FC1_OUTPUTS;
    const valueVector = i16x8.splat(<i16>value);
    const weightsLow = v128.load(inputWeightBase);
    const weightsHigh = v128.load(inputWeightBase, 16);
    const product0 = i16x8.mul(
      valueVector,
      i16x8.extend_low_i8x16_s(weightsLow),
    );
    const product1 = i16x8.mul(
      valueVector,
      i16x8.extend_high_i8x16_s(weightsLow),
    );
    const product2 = i16x8.mul(
      valueVector,
      i16x8.extend_low_i8x16_s(weightsHigh),
    );
    const product3 = i16x8.mul(
      valueVector,
      i16x8.extend_high_i8x16_s(weightsHigh),
    );

    sum0 = i32x4.add(sum0, i32x4.extend_low_i16x8_s(product0));
    sum1 = i32x4.add(sum1, i32x4.extend_high_i16x8_s(product0));
    sum2 = i32x4.add(sum2, i32x4.extend_low_i16x8_s(product1));
    sum3 = i32x4.add(sum3, i32x4.extend_high_i16x8_s(product1));
    sum4 = i32x4.add(sum4, i32x4.extend_low_i16x8_s(product2));
    sum5 = i32x4.add(sum5, i32x4.extend_high_i16x8_s(product2));
    sum6 = i32x4.add(sum6, i32x4.extend_low_i16x8_s(product3));
    sum7 = i32x4.add(sum7, i32x4.extend_high_i16x8_s(product3));
  }

  v128.store(FC1_SUMS, sum0, 0);
  v128.store(FC1_SUMS, sum1, 16);
  v128.store(FC1_SUMS, sum2, 32);
  v128.store(FC1_SUMS, sum3, 48);
  v128.store(FC1_SUMS, sum4, 64);
  v128.store(FC1_SUMS, sum5, 80);
  v128.store(FC1_SUMS, sum6, 96);
  v128.store(FC1_SUMS, sum7, 112);

  for (let output: i32 = 0; output < FC1_OUTPUTS; output++) {
    const value = load<i32>(FC1_SUMS + (output << 2)) >> WEIGHT_SCALE_SHIFT;

    store<u8>(FC1_ACTIVATIONS + output, <u8>clippedRelu(value, HIDDEN_MAX));
  }
}

function propagateFc2(layerStackIndex: i32): i32 {
  const bias = load<i32>(FC2_BIASES + (layerStackIndex << 2));
  const weightBase = FC2_WEIGHTS + layerStackIndex * FC1_OUTPUTS;
  let sum = bias + load<i32>(FC0_VALUES + (FC0_OUTPUTS << 2));

  for (let input: i32 = 0; input < FC1_OUTPUTS; input++) {
    sum +=
      <i32>load<u8>(FC1_ACTIVATIONS + input) *
      <i32>load<i8>(weightBase + input);
  }

  const numerator = <i64>sum * 600 * 16;
  const denominator: i64 = <i64>HIDDEN_ONE * (1 << WEIGHT_SCALE_SHIFT) * 2;

  return <i32>(numerator / denominator);
}

export function forward(layerStackIndex: i32, sideToMove: i32): i32 {
  writeFeatureVector(sideToMove);
  propagateFc0(layerStackIndex);
  activateFc0();
  propagateFc1(layerStackIndex);

  return propagateFc2(layerStackIndex);
}
