import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { COLOR } from "../../src/engine/constants/color";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import {
  NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
} from "../../src/search/constants/nnue";
import { appendHalfKaActiveFeatures } from "../../src/search/nnue/features";
import { appendFullThreatActiveFeatures } from "../../src/search/nnue/fullThreats";
import { getNnueLayerStackIndex } from "../../src/search/nnue/inference";
import { isPlausibleNnuePosition } from "../../src/search/nnue/positionValidation";
import { createSeededRandom } from "../../src/search/nnue/random";
import { createNnueTrainingScratch } from "./trainingScratch";
import type { TrainingRecord } from "./trainingPass";

const CACHE_MAGIC = "DCENFC01";
const CACHE_VERSION = 1;
const CACHE_HEADER_BYTES = 32;
const CACHE_FLAG_FULL_THREATS = 1;
const BASE_RECORD_BYTES = 136;
const FULL_THREAT_RECORD_BYTES = 652;

export type FeatureCacheHeader = {
  path: string;
  positions: number;
  recordBytes: number;
  includeFullThreats: boolean;
};

export type FeatureCacheBatch = {
  positions: number;
  targets: Float32Array;
  sideToMove: Float32Array;
  layerStacks: Int32Array;
  whiteHalfKa: Int32Array;
  blackHalfKa: Int32Array;
  whiteHalfKaMask: Float32Array;
  blackHalfKaMask: Float32Array;
  whiteFullThreats: Int32Array | null;
  blackFullThreats: Int32Array | null;
  whiteFullThreatMask: Float32Array | null;
  blackFullThreatMask: Float32Array | null;
};

const normalizeFen = (fen: string): string => {
  const parts = fen.trim().split(/\s+/);

  return parts.length === 4 ? `${fen} 0 1` : fen;
};

const parseTrainingRecord = (line: string): TrainingRecord => {
  const record = JSON.parse(line) as TrainingRecord;

  if (typeof record.fen !== "string" || !Number.isFinite(record.scoreCp)) {
    throw new Error(`Invalid training record: ${line}`);
  }

  return record;
};

const writeMagic = (buffer: Buffer): void => {
  for (let i = 0; i < CACHE_MAGIC.length; i++) {
    buffer[i] = CACHE_MAGIC.charCodeAt(i);
  }
};

const createHeaderBuffer = (
  positions: number,
  includeFullThreats: boolean,
): Buffer => {
  const buffer = Buffer.alloc(CACHE_HEADER_BYTES);

  writeMagic(buffer);
  buffer.writeUInt32LE(CACHE_VERSION, 8);
  buffer.writeUInt32LE(includeFullThreats ? CACHE_FLAG_FULL_THREATS : 0, 12);
  buffer.writeUInt32LE(
    includeFullThreats ? FULL_THREAT_RECORD_BYTES : BASE_RECORD_BYTES,
    16,
  );
  buffer.writeUInt32LE(positions, 20);
  buffer.writeUInt32LE(NNUE_MAX_ACTIVE_HALF_KA_FEATURES, 24);
  buffer.writeUInt32LE(NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES, 28);

  return buffer;
};

const encodeRecord = (
  record: TrainingRecord,
  includeFullThreats: boolean,
  scratch: ReturnType<typeof createNnueTrainingScratch>,
): Buffer | null => {
  const position = generateFenToPosition(normalizeFen(record.fen));

  if (!isPlausibleNnuePosition(position)) {
    return null;
  }
  const whiteHalfKaCount = appendHalfKaActiveFeatures(
    position,
    COLOR.WHITE,
    scratch.whiteHalfKaFeatures,
    0,
  );
  const blackHalfKaCount = appendHalfKaActiveFeatures(
    position,
    COLOR.BLACK,
    scratch.blackHalfKaFeatures,
    0,
  );

  if (whiteHalfKaCount !== blackHalfKaCount) {
    throw new Error(`HalfKA feature count mismatch for ${record.fen}`);
  }

  const buffer = Buffer.alloc(
    includeFullThreats ? FULL_THREAT_RECORD_BYTES : BASE_RECORD_BYTES,
  );

  buffer.writeFloatLE(record.scoreCp, 0);
  buffer.writeUInt8(position.color, 4);
  buffer.writeUInt8(getNnueLayerStackIndex(position), 5);
  buffer.writeUInt8(whiteHalfKaCount, 6);

  for (let i = 0; i < whiteHalfKaCount; i++) {
    buffer.writeUInt16LE(scratch.whiteHalfKaFeatures[i], 8 + i * 2);
    buffer.writeUInt16LE(scratch.blackHalfKaFeatures[i], 72 + i * 2);
  }

  if (!includeFullThreats) {
    return buffer;
  }

  const whiteThreatCount = appendFullThreatActiveFeatures(
    position,
    COLOR.WHITE,
    scratch.whiteFullThreatFeatures,
    0,
    scratch.fullThreatAttackScratch,
  );
  const blackThreatCount = appendFullThreatActiveFeatures(
    position,
    COLOR.BLACK,
    scratch.blackFullThreatFeatures,
    0,
    scratch.fullThreatAttackScratch,
  );

  buffer.writeUInt8(whiteThreatCount, 136);
  buffer.writeUInt8(blackThreatCount, 137);

  for (let i = 0; i < whiteThreatCount; i++) {
    buffer.writeUInt16LE(scratch.whiteFullThreatFeatures[i], 140 + i * 2);
  }

  for (let i = 0; i < blackThreatCount; i++) {
    buffer.writeUInt16LE(scratch.blackFullThreatFeatures[i], 396 + i * 2);
  }

  return buffer;
};

export const createFeatureCache = async (
  inputPath: string,
  outputPath: string,
  options: {
    includeFullThreats: boolean;
    logEvery: number;
    maxPositions?: number;
    onProgress?: (positions: number, elapsedMs: number) => void;
  },
): Promise<FeatureCacheHeader> => {
  const resolvedOutputPath = resolve(outputPath);
  const scratch = createNnueTrainingScratch();
  const lines = createInterface({
    input: createReadStream(resolve(inputPath)),
    crlfDelay: Infinity,
  });
  const startedAt = Date.now();

  await mkdir(dirname(resolvedOutputPath), { recursive: true });

  const output = createWriteStream(resolvedOutputPath, { flags: "w" });
  let positions = 0;

  output.write(createHeaderBuffer(0, options.includeFullThreats));

  try {
    for await (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }

      const record = parseTrainingRecord(line);
      const encoded = encodeRecord(record, options.includeFullThreats, scratch);

      if (encoded === null) {
        continue;
      }

      if (!output.write(encoded)) {
        await once(output, "drain");
      }

      positions++;

      if (
        options.maxPositions !== undefined &&
        positions >= options.maxPositions
      ) {
        break;
      }

      if (positions % options.logEvery === 0) {
        options.onProgress?.(positions, Date.now() - startedAt);
      }
    }
  } finally {
    lines.close();
    output.end();
    await once(output, "finish");
  }

  const file = await open(resolvedOutputPath, "r+");

  try {
    await file.write(
      createHeaderBuffer(positions, options.includeFullThreats),
      0,
      CACHE_HEADER_BYTES,
      0,
    );
  } finally {
    await file.close();
  }

  return {
    path: resolvedOutputPath,
    positions,
    recordBytes: options.includeFullThreats
      ? FULL_THREAT_RECORD_BYTES
      : BASE_RECORD_BYTES,
    includeFullThreats: options.includeFullThreats,
  };
};

const parseHeader = (path: string, buffer: Buffer): FeatureCacheHeader => {
  if (buffer.length !== CACHE_HEADER_BYTES) {
    throw new Error(`Invalid NNUE feature cache header: ${path}`);
  }

  for (let i = 0; i < CACHE_MAGIC.length; i++) {
    if (buffer[i] !== CACHE_MAGIC.charCodeAt(i)) {
      throw new Error(`Invalid NNUE feature cache magic: ${path}`);
    }
  }

  const version = buffer.readUInt32LE(8);

  if (version !== CACHE_VERSION) {
    throw new Error(`Unsupported NNUE feature cache version ${version}`);
  }

  const flags = buffer.readUInt32LE(12);
  const includeFullThreats = (flags & CACHE_FLAG_FULL_THREATS) !== 0;
  const recordBytes = buffer.readUInt32LE(16);
  const expectedRecordBytes = includeFullThreats
    ? FULL_THREAT_RECORD_BYTES
    : BASE_RECORD_BYTES;

  if (recordBytes !== expectedRecordBytes) {
    throw new Error(`Invalid NNUE feature cache record size ${recordBytes}`);
  }

  return {
    path,
    positions: buffer.readUInt32LE(20),
    recordBytes,
    includeFullThreats,
  };
};

export const readFeatureCacheHeader = async (
  inputPath: string,
): Promise<FeatureCacheHeader> => {
  const path = resolve(inputPath);
  const file = await open(path, "r");
  const buffer = Buffer.alloc(CACHE_HEADER_BYTES);

  try {
    const result = await file.read(buffer, 0, buffer.length, 0);

    if (result.bytesRead !== buffer.length) {
      throw new Error(`Truncated NNUE feature cache: ${path}`);
    }
  } finally {
    await file.close();
  }

  return parseHeader(path, buffer);
};

const createBatchOrder = (
  positions: number,
  batchSize: number,
  seed: number,
): number[] => {
  const batchCount = Math.ceil(positions / batchSize);
  const order = Array.from({ length: batchCount }, (_, index) => index);
  const random = createSeededRandom(seed);

  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.trunc(random() * (i + 1));
    const value = order[i];

    order[i] = order[j];
    order[j] = value;
  }

  return order;
};

const decodeBatch = (
  buffer: Buffer,
  positions: number,
  header: FeatureCacheHeader,
): FeatureCacheBatch => {
  const halfKaValues = positions * NNUE_MAX_ACTIVE_HALF_KA_FEATURES;
  const targets = new Float32Array(positions);
  const sideToMove = new Float32Array(positions);
  const layerStacks = new Int32Array(positions);
  const whiteHalfKa = new Int32Array(halfKaValues);
  const blackHalfKa = new Int32Array(halfKaValues);
  const whiteHalfKaMask = new Float32Array(halfKaValues);
  const blackHalfKaMask = new Float32Array(halfKaValues);
  const threatValues = positions * NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES;
  const whiteFullThreats = header.includeFullThreats
    ? new Int32Array(threatValues)
    : null;
  const blackFullThreats = header.includeFullThreats
    ? new Int32Array(threatValues)
    : null;
  const whiteFullThreatMask = header.includeFullThreats
    ? new Float32Array(threatValues)
    : null;
  const blackFullThreatMask = header.includeFullThreats
    ? new Float32Array(threatValues)
    : null;

  for (let positionIndex = 0; positionIndex < positions; positionIndex++) {
    const offset = positionIndex * header.recordBytes;
    const halfKaCount = buffer.readUInt8(offset + 6);

    targets[positionIndex] = buffer.readFloatLE(offset);
    sideToMove[positionIndex] =
      buffer.readUInt8(offset + 4) === COLOR.WHITE ? 1 : -1;
    layerStacks[positionIndex] = buffer.readUInt8(offset + 5);

    for (let featureIndex = 0; featureIndex < halfKaCount; featureIndex++) {
      const targetIndex =
        positionIndex * NNUE_MAX_ACTIVE_HALF_KA_FEATURES + featureIndex;

      whiteHalfKa[targetIndex] = buffer.readUInt16LE(
        offset + 8 + featureIndex * 2,
      );
      blackHalfKa[targetIndex] = buffer.readUInt16LE(
        offset + 72 + featureIndex * 2,
      );
      whiteHalfKaMask[targetIndex] = 1;
      blackHalfKaMask[targetIndex] = 1;
    }

    if (
      !header.includeFullThreats ||
      whiteFullThreats === null ||
      blackFullThreats === null ||
      whiteFullThreatMask === null ||
      blackFullThreatMask === null
    ) {
      continue;
    }

    const whiteThreatCount = buffer.readUInt8(offset + 136);
    const blackThreatCount = buffer.readUInt8(offset + 137);

    for (let featureIndex = 0; featureIndex < whiteThreatCount; featureIndex++) {
      const targetIndex =
        positionIndex * NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES + featureIndex;

      whiteFullThreats[targetIndex] = buffer.readUInt16LE(
        offset + 140 + featureIndex * 2,
      );
      whiteFullThreatMask[targetIndex] = 1;
    }

    for (let featureIndex = 0; featureIndex < blackThreatCount; featureIndex++) {
      const targetIndex =
        positionIndex * NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES + featureIndex;

      blackFullThreats[targetIndex] = buffer.readUInt16LE(
        offset + 396 + featureIndex * 2,
      );
      blackFullThreatMask[targetIndex] = 1;
    }
  }

  return {
    positions,
    targets,
    sideToMove,
    layerStacks,
    whiteHalfKa,
    blackHalfKa,
    whiteHalfKaMask,
    blackHalfKaMask,
    whiteFullThreats,
    blackFullThreats,
    whiteFullThreatMask,
    blackFullThreatMask,
  };
};

export async function* readFeatureCacheBatches(
  inputPath: string,
  options: { batchSize: number; shuffleSeed: number | null },
): AsyncGenerator<FeatureCacheBatch> {
  const header = await readFeatureCacheHeader(inputPath);
  const file = await open(header.path, "r");
  const order =
    options.shuffleSeed === null
      ? Array.from(
          { length: Math.ceil(header.positions / options.batchSize) },
          (_, index) => index,
        )
      : createBatchOrder(
          header.positions,
          options.batchSize,
          options.shuffleSeed,
        );

  try {
    for (const batchIndex of order) {
      const start = batchIndex * options.batchSize;
      const positions = Math.min(options.batchSize, header.positions - start);
      const buffer = Buffer.allocUnsafe(positions * header.recordBytes);
      const fileOffset = CACHE_HEADER_BYTES + start * header.recordBytes;
      const result = await file.read(buffer, 0, buffer.length, fileOffset);

      if (result.bytesRead !== buffer.length) {
        throw new Error(`Truncated NNUE feature cache batch: ${header.path}`);
      }

      yield decodeBatch(buffer, positions, header);
    }
  } finally {
    await file.close();
  }
}
