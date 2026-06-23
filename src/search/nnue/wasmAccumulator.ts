import { NNUE_TRANSFORMED_FEATURE_DIMENSIONS } from "../constants/nnue";
import type { NnueAccumulatorBackend } from "../types/nnue";

const ACCUMULATOR_SLOT_SIZE =
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS * Int32Array.BYTES_PER_ELEMENT;
export const createWasmAccumulatorBackend = (
  applyFeature: NnueAccumulatorBackend["applyFeature"],
  refreshAccumulator: NnueAccumulatorBackend["refreshAccumulator"],
  activeFeaturesScratch: Int32Array,
  activeFeaturesScratchPointer: number,
  memory: ArrayBuffer,
  accumulatorBase: number,
  accumulatorSlotCount: number,
): NnueAccumulatorBackend => ({
  memory,
  accumulatorBase,
  accumulatorSlotByteSize: ACCUMULATOR_SLOT_SIZE,
  accumulatorSlotCount,
  activeFeaturesScratch,
  activeFeaturesScratchPointer,
  applyFeature,
  refreshAccumulator,
});

export const createWasmAccumulatorView = (
  backend: NnueAccumulatorBackend,
  slot: number,
): Int32Array => {
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= backend.accumulatorSlotCount
  ) {
    throw new RangeError(`Invalid NNUE WASM accumulator slot: ${slot}`);
  }

  return new Int32Array(
    backend.memory,
    backend.accumulatorBase + slot * backend.accumulatorSlotByteSize,
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );
};

export const getWasmAccumulatorSlot = (
  backend: NnueAccumulatorBackend,
  accumulator: Int32Array,
): number | null => {
  if (
    accumulator.buffer !== backend.memory ||
    accumulator.length !== NNUE_TRANSFORMED_FEATURE_DIMENSIONS
  ) {
    return null;
  }

  const relativeOffset = accumulator.byteOffset - backend.accumulatorBase;

  if (
    relativeOffset < 0 ||
    relativeOffset % backend.accumulatorSlotByteSize !== 0
  ) {
    return null;
  }

  const slot = relativeOffset / backend.accumulatorSlotByteSize;

  return slot < backend.accumulatorSlotCount ? slot : null;
};
