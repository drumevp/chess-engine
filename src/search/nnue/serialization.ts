import {
  NNUE_MODEL_BINARY_MAGIC,
  NNUE_MODEL_BINARY_VERSION,
} from "../constants/nnue";
import type { NnueModel, NnueNetworkWeights } from "../types/nnue";
import { createEmptyNnueWeights, createNnueModel } from "./model";

type SerializableArray = Int8Array | Int16Array | Int32Array;

const HEADER_SIZE = NNUE_MODEL_BINARY_MAGIC.length + 8;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getArrayBytes = (values: SerializableArray): Uint8Array =>
  new Uint8Array(values.buffer, values.byteOffset, values.byteLength);

const getSerializedArrayByteLength = (values: SerializableArray): number =>
  values.byteLength;

const getSerializedLayerStackByteLength = (
  weights: NnueNetworkWeights,
): number =>
  getSerializedArrayByteLength(weights.fc0Bias) +
  getSerializedArrayByteLength(weights.fc0Weights) +
  getSerializedArrayByteLength(weights.fc1Bias) +
  getSerializedArrayByteLength(weights.fc1Weights) +
  getSerializedArrayByteLength(weights.fc2Bias) +
  getSerializedArrayByteLength(weights.fc2Weights);

const writeArray = (
  output: Uint8Array,
  offset: number,
  values: SerializableArray,
): number => {
  const bytes = getArrayBytes(values);

  output.set(bytes, offset);

  return offset + bytes.length;
};

const readArray = (
  input: Uint8Array,
  offset: number,
  output: SerializableArray,
): number => {
  const nextOffset = offset + output.byteLength;

  if (nextOffset > input.length) {
    throw new Error("Invalid NNUE model binary: truncated weights");
  }

  getArrayBytes(output).set(input.subarray(offset, nextOffset));

  return nextOffset;
};

const writeLayerStack = (
  output: Uint8Array,
  offset: number,
  weights: NnueNetworkWeights,
): number => {
  let nextOffset = offset;

  nextOffset = writeArray(output, nextOffset, weights.fc0Bias);
  nextOffset = writeArray(output, nextOffset, weights.fc0Weights);
  nextOffset = writeArray(output, nextOffset, weights.fc1Bias);
  nextOffset = writeArray(output, nextOffset, weights.fc1Weights);
  nextOffset = writeArray(output, nextOffset, weights.fc2Bias);
  nextOffset = writeArray(output, nextOffset, weights.fc2Weights);

  return nextOffset;
};

const readLayerStack = (
  input: Uint8Array,
  offset: number,
  weights: NnueNetworkWeights,
): number => {
  let nextOffset = offset;

  nextOffset = readArray(input, nextOffset, weights.fc0Bias);
  nextOffset = readArray(input, nextOffset, weights.fc0Weights);
  nextOffset = readArray(input, nextOffset, weights.fc1Bias);
  nextOffset = readArray(input, nextOffset, weights.fc1Weights);
  nextOffset = readArray(input, nextOffset, weights.fc2Bias);
  nextOffset = readArray(input, nextOffset, weights.fc2Weights);

  return nextOffset;
};

export const serializeNnueModel = (model: NnueModel): Uint8Array => {
  const metadataBytes = textEncoder.encode(JSON.stringify(model.metadata));
  const weightsByteLength =
    getSerializedArrayByteLength(model.weights.featureBias) +
    getSerializedArrayByteLength(model.weights.featureWeights) +
    getSerializedArrayByteLength(model.weights.threatWeights) +
    getSerializedArrayByteLength(model.weights.psqtWeights) +
    getSerializedArrayByteLength(model.weights.threatPsqtWeights) +
    model.weights.layerStacks.reduce(
      (total, layerStack) =>
        total + getSerializedLayerStackByteLength(layerStack),
      0,
    );
  const output = new Uint8Array(
    HEADER_SIZE + metadataBytes.length + weightsByteLength,
  );
  const view = new DataView(output.buffer);

  for (let i = 0; i < NNUE_MODEL_BINARY_MAGIC.length; i++) {
    output[i] = NNUE_MODEL_BINARY_MAGIC.charCodeAt(i);
  }

  view.setUint32(NNUE_MODEL_BINARY_MAGIC.length, NNUE_MODEL_BINARY_VERSION, true);
  view.setUint32(NNUE_MODEL_BINARY_MAGIC.length + 4, metadataBytes.length, true);

  let offset = HEADER_SIZE;

  output.set(metadataBytes, offset);
  offset += metadataBytes.length;
  offset = writeArray(output, offset, model.weights.featureBias);
  offset = writeArray(output, offset, model.weights.featureWeights);
  offset = writeArray(output, offset, model.weights.threatWeights);
  offset = writeArray(output, offset, model.weights.psqtWeights);
  offset = writeArray(output, offset, model.weights.threatPsqtWeights);

  for (const layerStack of model.weights.layerStacks) {
    offset = writeLayerStack(output, offset, layerStack);
  }

  return output;
};

export const deserializeNnueModel = (input: Uint8Array): NnueModel => {
  if (input.length < HEADER_SIZE) {
    throw new Error("Invalid NNUE model binary: missing header");
  }

  for (let i = 0; i < NNUE_MODEL_BINARY_MAGIC.length; i++) {
    if (input[i] !== NNUE_MODEL_BINARY_MAGIC.charCodeAt(i)) {
      throw new Error("Invalid NNUE model binary: bad magic");
    }
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const version = view.getUint32(NNUE_MODEL_BINARY_MAGIC.length, true);

  if (version !== NNUE_MODEL_BINARY_VERSION) {
    throw new Error("Invalid NNUE model binary: unsupported version");
  }

  const metadataLength = view.getUint32(NNUE_MODEL_BINARY_MAGIC.length + 4, true);
  let offset = HEADER_SIZE;
  const metadataEnd = offset + metadataLength;

  if (metadataEnd > input.length) {
    throw new Error("Invalid NNUE model binary: truncated metadata");
  }

  const metadata = JSON.parse(
    textDecoder.decode(input.subarray(offset, metadataEnd)),
  ) as NnueModel["metadata"];
  const weights = createEmptyNnueWeights();

  offset = metadataEnd;
  offset = readArray(input, offset, weights.featureBias);
  offset = readArray(input, offset, weights.featureWeights);
  offset = readArray(input, offset, weights.threatWeights);
  offset = readArray(input, offset, weights.psqtWeights);
  offset = readArray(input, offset, weights.threatPsqtWeights);

  for (const layerStack of weights.layerStacks) {
    offset = readLayerStack(input, offset, layerStack);
  }

  if (offset !== input.length) {
    throw new Error("Invalid NNUE model binary: trailing bytes");
  }

  return createNnueModel(metadata, weights);
};
