import { spawn, type ChildProcess } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import ChessEngine from "../../src/engine/ChessEngine";
import { COLOR } from "../../src/engine/constants/color";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import generateAttackInfo, {
  createAttackInfo,
} from "../../src/engine/movegen/attackInfo/main";
import generateLegalMovesFromContext from "../../src/engine/movegen/generateLegalMovesFromContext";
import getMoveGenerationContext, {
  createMoveGenerationContext,
} from "../../src/engine/movegen/getMoveGenerationContext";
import { createMoveList } from "../../src/engine/movegen/moveList";
import simpleEval from "../../src/search/eval/simpleEval";
import {
  NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
} from "../../src/search/constants/nnue";
import { appendHalfKaActiveFeatures } from "../../src/search/nnue/features";
import { appendFullThreatActiveFeatures } from "../../src/search/nnue/fullThreats";
import { createNnueEvaluator, evaluateNnue } from "../../src/search/nnue/inference";
import { DEFAULT_NNUE_MODEL_METADATA } from "../../src/search/nnue/defaultModel";
import { createMaterialNnueModel } from "../../src/search/nnue/model";
import { createNnueScratch } from "../../src/search/nnue/scratch";
import { isPlausibleNnuePosition } from "../../src/search/nnue/positionValidation";
import type { AttackInfo } from "../../src/engine/types/attackInfo";
import type { MoveGenerationContext, MoveList } from "../../src/engine/types/move";
import type { Position } from "../../src/engine/types/position";
import type { NnueModel, SearchEvaluator } from "../../src/search/types/nnue";
import { UciClient, type UciScore } from "../../src/uci/UciClient";
import { MATCH_OPENING_LINES } from "../engine/matchOpenings";
import { chooseSearchMove } from "../engine/searchMoves";
import { getArg, getNumberArg, hasArg } from "./args";
import { createFeatureCache } from "./featureCache";
import { createJsonlWriter } from "./jsonl";
import {
  ensureDefaultNnueCheckpoint,
  getTimestamp,
  loadNnueModel,
  promoteDefaultNnueCheckpoint,
  writeNnueCheckpoint,
} from "./modelFiles";
import {
  applyOutputCalibration,
  evaluateTrainableNnueRecord,
  trainNnueRecord,
  writeTrainableWeightsToModel,
  type NnueTrainingLossKind,
  type NnueTrainingLoss,
  type NnueOutputCalibration,
  type NnueTrainingOptions,
  type TrainingRecord,
} from "./trainingPass";
import { createNnueTrainingScratch } from "./trainingScratch";
import { createTrainableNnueWeights } from "./trainingWeights";
import {
  trainTensorNnue,
  type TensorTrainingEpochSummary,
  type TensorTrainingPhase,
} from "./tensorTraining";

type LichessPrincipalVariation = {
  cp?: number;
  mate?: number;
  line?: string;
};

type LichessEvaluation = {
  depth?: number;
  knodes?: number;
  pvs?: LichessPrincipalVariation[];
};

type LichessEvaluationRecord = {
  fen: string;
  evals: LichessEvaluation[];
};

type ParsedScore = {
  whitePerspectiveScoreCp: number;
  isMate: boolean;
};

type DatasetScratch = {
  moveList: MoveList;
  ctx: MoveGenerationContext;
  attackInfo: AttackInfo;
  halfKaFeatures: Uint32Array;
  fullThreatFeatures: Uint32Array;
  fullThreatAttackScratch: { lo: number; hi: number };
};

type DatasetSummary = {
  inputPath: string;
  trainPath: string;
  validationPath: string;
  read: number;
  trainPositions: number;
  validationPositions: number;
  skipped: number;
  skippedMate: number;
  skippedOutOfRange: number;
  skippedCheck: number;
  skippedTerminal: number;
  skippedInvalidPosition: number;
  skippedSampling: number;
};

type ValidationSummary = {
  positions: number;
  zeroMae: number;
  materialMae: number;
  defaultNnueMae: number;
  candidateNnueMae: number;
  buckets: ValidationBucketSummary[];
  defaultOutput: OutputDistributionSummary;
  candidateOutput: OutputDistributionSummary;
  targetOutput: OutputDistributionSummary;
};

type NnueDatasetMaeSummary = {
  positions: number;
  meanAbsoluteError: number;
};

type ValidationBucketSummary = {
  label: string;
  minAbsCp: number;
  maxAbsCp: number;
  positions: number;
  zeroMae: number;
  defaultNnueMae: number;
  candidateNnueMae: number;
  targetAverageAbsCp: number;
  defaultAverageAbsCp: number;
  candidateAverageAbsCp: number;
};

type OutputDistributionSummary = {
  positions: number;
  averageAbsCp: number;
  minCp: number;
  maxCp: number;
  exactZeroPercent: number;
  absUnder10Percent: number;
  absUnder50Percent: number;
};

type OutputDistributionAccumulator = {
  positions: number;
  absTotal: number;
  minCp: number;
  maxCp: number;
  exactZero: number;
  absUnder10: number;
  absUnder50: number;
};

type ValidationBucketAccumulator = ValidationBucketSummary & {
  zeroErrorTotal: number;
  defaultErrorTotal: number;
  candidateErrorTotal: number;
  targetAbsTotal: number;
  defaultAbsTotal: number;
  candidateAbsTotal: number;
};

type MatchGameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

type MatchSummary = {
  stockfishElo: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  unfinished: number;
  scoreRate: number;
  estimatedElo: number;
};

type PromotionDecision = {
  promoted: boolean;
  reasons: string[];
};

type EpochSummary = {
  phase: string;
  epoch: number;
  positions: number;
  meanAbsoluteError: number;
  rootMeanSquaredError: number;
  meanLoss: number;
  meanWdlError: number;
};

type TrainingPhase = {
  name: string;
  epochs: number;
  quantizeForward: boolean;
  options: NnueTrainingOptions;
};

type CalibrationSummary = NnueOutputCalibration & {
  positions: number;
  rawSlope: number;
  rawIntercept: number;
};

const getEngineResultLabel = (
  result: MatchGameResult,
  engineColor: typeof COLOR.WHITE | typeof COLOR.BLACK,
): "win" | "draw" | "loss" | "unfinished" => {
  if (result === "*") {
    return "unfinished";
  }

  const score = scoreForEngine(result, engineColor);

  if (score === 1) {
    return "win";
  }

  if (score === 0) {
    return "loss";
  }

  return "draw";
};

const MATE_SCORE_CP = 30_000;
const STOCKFISH_MIN_UCI_ELO = 1320;

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

const formatDecimal = (value: number, digits = 2): string =>
  value.toFixed(digits);

const logSection = (message: string): void => {
  console.log(`\n== ${message} ==`);
};

const logProgress = (
  stage: string,
  processed: number,
  target: number,
  startedAt: number,
  details: string,
): void => {
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const rate = processed / Math.max(0.001, elapsedSeconds);
  const percent = target <= 0 ? 0 : (processed / target) * 100;
  const eta = target <= processed ? 0 : (target - processed) / rate;

  console.log(
    `[${stage}] ${formatNumber(processed)}/${formatNumber(target)} ` +
      `(${formatDecimal(percent, 1)}%) ` +
      `${formatDecimal(rate, 0)}/s eta ${formatDecimal(eta, 0)}s ${details}`,
  );
};

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const parseEloList = (value: string): number[] =>
  value.split(",").map((elo) => {
    const parsed = Number(elo.trim());

    if (!Number.isInteger(parsed) || parsed < STOCKFISH_MIN_UCI_ELO) {
      throw new Error(
        `Stockfish UCI_Elo must be an integer >= ${STOCKFISH_MIN_UCI_ELO}: ${elo}`,
      );
    }

    return parsed;
  });

const parseTrainingLoss = (value: string): NnueTrainingLossKind => {
  if (value === "cp" || value === "wdl" || value === "mixed") {
    return value;
  }

  throw new Error(`Invalid --loss: ${value}. Expected cp, wdl, or mixed.`);
};

const scaleTrainingRates = (
  rates: NnueTrainingOptions["rates"],
  scale: number,
): NnueTrainingOptions["rates"] => ({
  network: rates.network * scale,
  feature: rates.feature * scale,
  threat: rates.threat * scale,
  psqt: rates.psqt * scale,
  bias: rates.bias * scale,
});

const normalizeFen = (fen: string): string => {
  const parts = fen.trim().split(/\s+/);

  if (parts.length === 4) {
    return `${fen} 0 1`;
  }

  if (parts.length !== 6) {
    throw new Error(`Invalid FEN field count: ${fen}`);
  }

  return fen;
};

const getFenSideToMove = (fen: string): "w" | "b" => {
  const sideToMove = fen.trim().split(/\s+/)[1];

  if (sideToMove !== "w" && sideToMove !== "b") {
    throw new Error(`Invalid FEN side to move: ${fen}`);
  }

  return sideToMove;
};

const parseScore = (pv: LichessPrincipalVariation): ParsedScore | null => {
  if (typeof pv.cp === "number") {
    return {
      whitePerspectiveScoreCp: pv.cp,
      isMate: false,
    };
  }

  if (typeof pv.mate === "number") {
    return {
      whitePerspectiveScoreCp:
        Math.sign(pv.mate) * (MATE_SCORE_CP - Math.abs(pv.mate)),
      isMate: true,
    };
  }

  return null;
};

const whitePerspectiveToSideToMove = (fen: string, scoreCp: number): number =>
  getFenSideToMove(fen) === "w" ? scoreCp : -scoreCp;

const selectEvaluation = (
  evals: LichessEvaluation[],
  minDepth: number,
): LichessEvaluation | null => {
  let bestEvaluation: LichessEvaluation | null = null;
  let bestDepth = -1;
  let bestKNodes = -1;

  for (const evaluation of evals) {
    const depth = evaluation.depth ?? 0;
    const knodes = evaluation.knodes ?? 0;

    if (depth < minDepth || evaluation.pvs?.[0] === undefined) {
      continue;
    }

    if (depth > bestDepth || (depth === bestDepth && knodes > bestKNodes)) {
      bestEvaluation = evaluation;
      bestDepth = depth;
      bestKNodes = knodes;
    }
  }

  return bestEvaluation;
};

const createDatasetScratch = (): DatasetScratch => {
  const moveList = createMoveList();

  return {
    moveList,
    ctx: createMoveGenerationContext(moveList),
    attackInfo: createAttackInfo(),
    halfKaFeatures: new Uint32Array(NNUE_MAX_ACTIVE_HALF_KA_FEATURES),
    fullThreatFeatures: new Uint32Array(NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES),
    fullThreatAttackScratch: { lo: 0, hi: 0 },
  };
};

const assertNnueEncodablePosition = (
  position: Position,
  scratch: DatasetScratch,
  includeFullThreats: boolean,
): void => {
  appendHalfKaActiveFeatures(position, COLOR.WHITE, scratch.halfKaFeatures, 0);
  appendHalfKaActiveFeatures(position, COLOR.BLACK, scratch.halfKaFeatures, 0);

  if (!includeFullThreats) {
    return;
  }

  appendFullThreatActiveFeatures(
    position,
    COLOR.WHITE,
    scratch.fullThreatFeatures,
    0,
    scratch.fullThreatAttackScratch,
  );
  appendFullThreatActiveFeatures(
    position,
    COLOR.BLACK,
    scratch.fullThreatFeatures,
    0,
    scratch.fullThreatAttackScratch,
  );
};

const getPositionFilter = (
  fen: string,
  scratch: DatasetScratch,
  options: { includeFullThreats: boolean; validateLegalMoves: boolean },
): { isCheck: boolean; isTerminal: boolean } => {
  const position = generateFenToPosition(fen);

  if (!isPlausibleNnuePosition(position)) {
    throw new Error(`Implausible chess position: ${fen}`);
  }

  assertNnueEncodablePosition(position, scratch, options.includeFullThreats);

  const ctx = getMoveGenerationContext(position, scratch.moveList, scratch.ctx);
  const attackInfo = generateAttackInfo(ctx, scratch.attackInfo);
  const legalMoveCount = options.validateLegalMoves
    ? generateLegalMovesFromContext(ctx, attackInfo)
    : 1;

  return {
    isCheck: attackInfo.checkCount > 0,
    isTerminal: legalMoveCount === 0,
  };
};

const openMaybeCompressedInput = (
  inputPath: string,
): { input: NodeJS.ReadableStream; child: ChildProcess | null } => {
  if (!inputPath.endsWith(".zst")) {
    return {
      input: createReadStream(resolve(inputPath)),
      child: null,
    };
  }

  const child = spawn("zstd", ["-dcqq", resolve(inputPath)], {
    stdio: ["ignore", "pipe", "ignore"],
  });

  return { input: child.stdout, child };
};

const parseLichessRecord = (
  line: string,
  minDepth: number,
  maxAbsCp: number,
  scratch: DatasetScratch,
  summary: DatasetSummary,
  options: { includeFullThreats: boolean; validateLegalMoves: boolean },
): TrainingRecord | null => {
  const record = JSON.parse(line) as LichessEvaluationRecord;
  const evaluation = selectEvaluation(record.evals, minDepth);

  if (typeof record.fen !== "string" || evaluation === null) {
    return null;
  }

  const pv = evaluation.pvs?.[0];

  if (pv === undefined) {
    return null;
  }

  const parsedScore = parseScore(pv);

  if (parsedScore === null || parsedScore.isMate) {
    if (parsedScore?.isMate === true) {
      summary.skippedMate++;
    }

    return null;
  }

  const fen = normalizeFen(record.fen);
  const scoreCp = whitePerspectiveToSideToMove(
    fen,
    parsedScore.whitePerspectiveScoreCp,
  );

  if (Math.abs(scoreCp) > maxAbsCp) {
    summary.skippedOutOfRange++;
    return null;
  }

  const positionFilter = getPositionFilter(fen, scratch, options);

  if (positionFilter.isCheck || positionFilter.isTerminal) {
    if (positionFilter.isCheck) {
      summary.skippedCheck++;
    }

    if (positionFilter.isTerminal) {
      summary.skippedTerminal++;
    }

    return null;
  }

  return { fen, scoreCp };
};

const flushRandomTrainingRecord = async (
  buffer: TrainingRecord[],
  random: () => number,
  writeRecord: (record: TrainingRecord) => Promise<void>,
): Promise<void> => {
  const index = Math.trunc(random() * buffer.length);
  const record = buffer[index];
  buffer[index] = buffer[buffer.length - 1];
  buffer.pop();

  await writeRecord(record);
};

const createTrainingDataset = async (
  inputPath: string,
  trainPath: string,
  validationPath: string,
  options: {
    positions: number;
    validationPositions: number;
    minDepth: number;
    maxAbsCp: number;
    sampleMultiplier: number;
    shuffleBuffer: number;
    seed: number;
    logEvery: number;
    includeFullThreats: boolean;
    validateLegalMoves: boolean;
  },
): Promise<DatasetSummary> => {
  await access(resolve(inputPath));

  const random = createSeededRandom(options.seed);
  const sampleRate = 1 / Math.max(1, options.sampleMultiplier);
  const scratch = createDatasetScratch();
  const trainWriter = await createJsonlWriter(trainPath);
  const validationWriter = await createJsonlWriter(validationPath);
  const { input, child } = openMaybeCompressedInput(inputPath);
  const lines = createInterface({ input, crlfDelay: Infinity });
  const startedAt = Date.now();
  const trainBuffer: TrainingRecord[] = [];
  let lastDatasetProgress = 0;
  const summary: DatasetSummary = {
    inputPath,
    trainPath,
    validationPath,
    read: 0,
    trainPositions: 0,
    validationPositions: 0,
    skipped: 0,
    skippedMate: 0,
    skippedOutOfRange: 0,
    skippedCheck: 0,
    skippedTerminal: 0,
    skippedInvalidPosition: 0,
    skippedSampling: 0,
  };

  const writeTrain = async (record: TrainingRecord): Promise<void> => {
    await trainWriter.write(record);
    summary.trainPositions++;
  };

  try {
    for await (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }

      summary.read++;

      let record: TrainingRecord | null = null;

      try {
        record = parseLichessRecord(
          line,
          options.minDepth,
          options.maxAbsCp,
          scratch,
          summary,
          {
            includeFullThreats: options.includeFullThreats,
            validateLegalMoves: options.validateLegalMoves,
          },
        );
      } catch {
        summary.skipped++;
        summary.skippedInvalidPosition++;
        continue;
      }

      if (record === null) {
        summary.skipped++;
        continue;
      }

      if (random() > sampleRate) {
        summary.skippedSampling++;
        continue;
      }

      const trainTotal = summary.trainPositions + trainBuffer.length;
      const needsTrain = trainTotal < options.positions;
      const needsValidation =
        summary.validationPositions < options.validationPositions;

      if (!needsTrain && !needsValidation) {
        break;
      }

      const validationProbability =
        options.validationPositions / (options.positions + options.validationPositions);
      const useValidation =
        needsValidation && (!needsTrain || random() < validationProbability);

      if (useValidation) {
        await validationWriter.write(record);
        summary.validationPositions++;
      } else if (needsTrain) {
        trainBuffer.push(record);

        if (trainBuffer.length >= options.shuffleBuffer) {
          await flushRandomTrainingRecord(trainBuffer, random, writeTrain);
        }
      }

      const datasetProgress = summary.trainPositions + trainBuffer.length;

      if (
        datasetProgress > 0 &&
        datasetProgress !== lastDatasetProgress &&
        datasetProgress % options.logEvery === 0
      ) {
        lastDatasetProgress = datasetProgress;
        logProgress(
          "dataset",
          datasetProgress,
          options.positions,
          startedAt,
          `validation ${formatNumber(summary.validationPositions)}`,
        );
      }
    }

    for (let i = trainBuffer.length - 1; i > 0; i--) {
      const j = Math.trunc(random() * (i + 1));
      [trainBuffer[i], trainBuffer[j]] = [trainBuffer[j], trainBuffer[i]];
    }

    for (const record of trainBuffer) {
      await writeTrain(record);
    }
  } finally {
    lines.close();
    child?.kill("SIGTERM");
    await trainWriter.close();
    await validationWriter.close();
  }

  if (summary.trainPositions < options.positions) {
    throw new Error(
      `Only created ${summary.trainPositions} training positions; requested ${options.positions}`,
    );
  }

  if (summary.validationPositions < options.validationPositions) {
    throw new Error(
      `Only created ${summary.validationPositions} validation positions; requested ${options.validationPositions}`,
    );
  }

  return summary;
};

const countJsonlRecords = async (path: string): Promise<number> => {
  const lines = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  let positions = 0;

  for await (const line of lines) {
    if (line.trim().length > 0) {
      positions++;
    }
  }

  return positions;
};

const reuseTrainingDataset = async (
  directory: string,
): Promise<DatasetSummary> => {
  const trainPath = resolve(directory, "train.jsonl");
  const validationPath = resolve(directory, "validation.jsonl");

  await access(trainPath);
  await access(validationPath);

  const trainPositions = await countJsonlRecords(trainPath);
  const validationPositions = await countJsonlRecords(validationPath);

  return {
    inputPath: `reused:${resolve(directory)}`,
    trainPath,
    validationPath,
    read: trainPositions + validationPositions,
    trainPositions,
    validationPositions,
    skipped: 0,
    skippedMate: 0,
    skippedOutOfRange: 0,
    skippedCheck: 0,
    skippedTerminal: 0,
    skippedInvalidPosition: 0,
    skippedSampling: 0,
  };
};

const readTrainingRecord = (line: string): TrainingRecord => {
  const record = JSON.parse(line) as TrainingRecord;

  if (typeof record.fen !== "string" || !Number.isFinite(record.scoreCp)) {
    throw new Error(`Invalid training record: ${line}`);
  }

  return record;
};

const addLoss = (
  metrics: {
    positions: number;
    absoluteErrorTotal: number;
    squaredErrorTotal: number;
    lossTotal: number;
    wdlErrorTotal: number;
  },
  loss: NnueTrainingLoss,
): void => {
  metrics.positions++;
  metrics.absoluteErrorTotal += loss.absoluteError;
  metrics.squaredErrorTotal += loss.squaredError;
  metrics.lossTotal += loss.loss;
  metrics.wdlErrorTotal += loss.wdlError;
};

const trainEpoch = async (
  datasetPath: string,
  phaseName: string,
  epoch: number,
  options: NnueTrainingOptions & { logEvery: number; positions: number },
  weights: ReturnType<typeof createTrainableNnueWeights>,
): Promise<EpochSummary> => {
  const startedAt = Date.now();
  const scratch = createNnueTrainingScratch();
  const lines = createInterface({
    input: createReadStream(datasetPath),
    crlfDelay: Infinity,
  });
  const metrics = {
    positions: 0,
    absoluteErrorTotal: 0,
    squaredErrorTotal: 0,
    lossTotal: 0,
    wdlErrorTotal: 0,
  };

  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = readTrainingRecord(line);
    const loss = trainNnueRecord(weights, record, scratch, options);

    addLoss(metrics, loss);

    if (metrics.positions % options.logEvery === 0) {
      logProgress(
        "train",
        metrics.positions,
        options.positions,
        startedAt,
        `${phaseName} epoch ${epoch} mae ${formatDecimal(
          metrics.absoluteErrorTotal / metrics.positions,
        )} rmse ${formatDecimal(
          Math.sqrt(metrics.squaredErrorTotal / metrics.positions),
        )} loss ${formatDecimal(
          metrics.lossTotal / metrics.positions,
          4,
        )} wdl ${formatDecimal(metrics.wdlErrorTotal / metrics.positions, 4)}`,
      );
    }
  }

  return {
    phase: phaseName,
    epoch,
    positions: metrics.positions,
    meanAbsoluteError: metrics.absoluteErrorTotal / metrics.positions,
    rootMeanSquaredError: Math.sqrt(
      metrics.squaredErrorTotal / metrics.positions,
    ),
    meanLoss: metrics.lossTotal / metrics.positions,
    meanWdlError: metrics.wdlErrorTotal / metrics.positions,
  };
};

const VALIDATION_BUCKETS = [
  { label: "0-50", minAbsCp: 0, maxAbsCp: 50 },
  { label: "50-100", minAbsCp: 50, maxAbsCp: 100 },
  { label: "100-200", minAbsCp: 100, maxAbsCp: 200 },
  { label: "200-500", minAbsCp: 200, maxAbsCp: 500 },
  { label: "500-1000", minAbsCp: 500, maxAbsCp: 1_000 },
  { label: "1000-3000", minAbsCp: 1_000, maxAbsCp: 3_000 },
];

const createOutputDistributionAccumulator = (): OutputDistributionAccumulator => ({
  positions: 0,
  absTotal: 0,
  minCp: Number.POSITIVE_INFINITY,
  maxCp: Number.NEGATIVE_INFINITY,
  exactZero: 0,
  absUnder10: 0,
  absUnder50: 0,
});

const addOutputDistribution = (
  accumulator: OutputDistributionAccumulator,
  scoreCp: number,
): void => {
  const absScore = Math.abs(scoreCp);

  accumulator.positions++;
  accumulator.absTotal += absScore;
  accumulator.minCp = Math.min(accumulator.minCp, scoreCp);
  accumulator.maxCp = Math.max(accumulator.maxCp, scoreCp);

  if (scoreCp === 0) {
    accumulator.exactZero++;
  }

  if (absScore < 10) {
    accumulator.absUnder10++;
  }

  if (absScore < 50) {
    accumulator.absUnder50++;
  }
};

const summarizeOutputDistribution = (
  accumulator: OutputDistributionAccumulator,
): OutputDistributionSummary => {
  const positions = accumulator.positions;

  if (positions === 0) {
    return {
      positions: 0,
      averageAbsCp: 0,
      minCp: 0,
      maxCp: 0,
      exactZeroPercent: 0,
      absUnder10Percent: 0,
      absUnder50Percent: 0,
    };
  }

  return {
    positions,
    averageAbsCp: accumulator.absTotal / positions,
    minCp: accumulator.minCp,
    maxCp: accumulator.maxCp,
    exactZeroPercent: (accumulator.exactZero / positions) * 100,
    absUnder10Percent: (accumulator.absUnder10 / positions) * 100,
    absUnder50Percent: (accumulator.absUnder50 / positions) * 100,
  };
};

const createBucketAccumulator = (
  bucket: (typeof VALIDATION_BUCKETS)[number],
): ValidationBucketAccumulator => ({
  ...bucket,
  positions: 0,
  zeroMae: 0,
  defaultNnueMae: 0,
  candidateNnueMae: 0,
  targetAverageAbsCp: 0,
  defaultAverageAbsCp: 0,
  candidateAverageAbsCp: 0,
  zeroErrorTotal: 0,
  defaultErrorTotal: 0,
  candidateErrorTotal: 0,
  targetAbsTotal: 0,
  defaultAbsTotal: 0,
  candidateAbsTotal: 0,
});

const findValidationBucket = (
  buckets: ValidationBucketAccumulator[],
  absTargetCp: number,
): ValidationBucketAccumulator => {
  for (const bucket of buckets) {
    if (absTargetCp >= bucket.minAbsCp && absTargetCp < bucket.maxAbsCp) {
      return bucket;
    }
  }

  return buckets[buckets.length - 1];
};

const summarizeBucket = (
  bucket: ValidationBucketAccumulator,
): ValidationBucketSummary => {
  if (bucket.positions === 0) {
    return {
      label: bucket.label,
      minAbsCp: bucket.minAbsCp,
      maxAbsCp: bucket.maxAbsCp,
      positions: 0,
      zeroMae: 0,
      defaultNnueMae: 0,
      candidateNnueMae: 0,
      targetAverageAbsCp: 0,
      defaultAverageAbsCp: 0,
      candidateAverageAbsCp: 0,
    };
  }

  return {
    label: bucket.label,
    minAbsCp: bucket.minAbsCp,
    maxAbsCp: bucket.maxAbsCp,
    positions: bucket.positions,
    zeroMae: bucket.zeroErrorTotal / bucket.positions,
    defaultNnueMae: bucket.defaultErrorTotal / bucket.positions,
    candidateNnueMae: bucket.candidateErrorTotal / bucket.positions,
    targetAverageAbsCp: bucket.targetAbsTotal / bucket.positions,
    defaultAverageAbsCp: bucket.defaultAbsTotal / bucket.positions,
    candidateAverageAbsCp: bucket.candidateAbsTotal / bucket.positions,
  };
};

const evaluateValidation = async (
  validationPath: string,
  defaultModel: NnueModel,
  candidateModel: NnueModel,
): Promise<ValidationSummary> => {
  const lines = createInterface({
    input: createReadStream(validationPath),
    crlfDelay: Infinity,
  });
  const defaultScratch = createNnueScratch();
  const candidateScratch = createNnueScratch();
  const targetOutput = createOutputDistributionAccumulator();
  const defaultOutput = createOutputDistributionAccumulator();
  const candidateOutput = createOutputDistributionAccumulator();
  const buckets = VALIDATION_BUCKETS.map(createBucketAccumulator);
  let positions = 0;
  let zeroError = 0;
  let materialError = 0;
  let defaultError = 0;
  let candidateError = 0;

  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = readTrainingRecord(line);
    const position = generateFenToPosition(record.fen);

    if (!isPlausibleNnuePosition(position)) {
      continue;
    }
    const defaultScore = evaluateNnue(defaultModel, position, defaultScratch);
    const candidateScore = evaluateNnue(candidateModel, position, candidateScratch);
    const zeroAbsError = Math.abs(record.scoreCp);
    const defaultAbsError = Math.abs(defaultScore - record.scoreCp);
    const candidateAbsError = Math.abs(candidateScore - record.scoreCp);
    const bucket = findValidationBucket(buckets, Math.abs(record.scoreCp));

    positions++;
    zeroError += zeroAbsError;
    materialError += Math.abs(simpleEval(position) - record.scoreCp);
    defaultError += defaultAbsError;
    candidateError += candidateAbsError;
    addOutputDistribution(targetOutput, record.scoreCp);
    addOutputDistribution(defaultOutput, defaultScore);
    addOutputDistribution(candidateOutput, candidateScore);

    bucket.positions++;
    bucket.zeroErrorTotal += zeroAbsError;
    bucket.defaultErrorTotal += defaultAbsError;
    bucket.candidateErrorTotal += candidateAbsError;
    bucket.targetAbsTotal += Math.abs(record.scoreCp);
    bucket.defaultAbsTotal += Math.abs(defaultScore);
    bucket.candidateAbsTotal += Math.abs(candidateScore);
  }

  return {
    positions,
    zeroMae: zeroError / positions,
    materialMae: materialError / positions,
    defaultNnueMae: defaultError / positions,
    candidateNnueMae: candidateError / positions,
    buckets: buckets.map(summarizeBucket),
    defaultOutput: summarizeOutputDistribution(defaultOutput),
    candidateOutput: summarizeOutputDistribution(candidateOutput),
    targetOutput: summarizeOutputDistribution(targetOutput),
  };
};

const evaluateNnueDatasetMae = async (
  datasetPath: string,
  model: NnueModel,
  maxPositions: number,
  logEvery: number,
  label: string,
): Promise<NnueDatasetMaeSummary> => {
  const lines = createInterface({
    input: createReadStream(datasetPath),
    crlfDelay: Infinity,
  });
  const scratch = createNnueScratch();
  const startedAt = Date.now();
  let positions = 0;
  let absoluteErrorTotal = 0;

  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = readTrainingRecord(line);
    const position = generateFenToPosition(record.fen);

    if (!isPlausibleNnuePosition(position)) {
      continue;
    }

    positions++;
    absoluteErrorTotal += Math.abs(
      evaluateNnue(model, position, scratch) - record.scoreCp,
    );

    if (positions % logEvery === 0) {
      logProgress(
        label,
        positions,
        maxPositions,
        startedAt,
        `mae ${formatDecimal(absoluteErrorTotal / positions)}`,
      );
    }

    if (positions >= maxPositions) {
      break;
    }
  }

  if (positions === 0) {
    throw new Error(`Cannot evaluate empty dataset: ${datasetPath}`);
  }

  return {
    positions,
    meanAbsoluteError: absoluteErrorTotal / positions,
  };
};

const fitOutputCalibration = async (
  datasetPath: string,
  weights: ReturnType<typeof createTrainableNnueWeights>,
  options: {
    maxPositions: number;
    minSlope: number;
    maxSlope: number;
    minIntercept: number;
    maxIntercept: number;
    logEvery: number;
  },
): Promise<CalibrationSummary> => {
  const lines = createInterface({
    input: createReadStream(datasetPath),
    crlfDelay: Infinity,
  });
  const scratch = createNnueTrainingScratch();
  const startedAt = Date.now();
  let positions = 0;
  let sumPrediction = 0;
  let sumTarget = 0;
  let sumPredictionSquared = 0;
  let sumPredictionTarget = 0;

  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = readTrainingRecord(line);
    const predicted = evaluateTrainableNnueRecord(weights, record, scratch);
    const target = record.scoreCp;

    positions++;
    sumPrediction += predicted;
    sumTarget += target;
    sumPredictionSquared += predicted * predicted;
    sumPredictionTarget += predicted * target;

    if (positions % options.logEvery === 0) {
      logProgress(
        "calibrate",
        positions,
        options.maxPositions,
        startedAt,
        "fitting output scale",
      );
    }

    if (positions >= options.maxPositions) {
      break;
    }
  }

  if (positions === 0) {
    throw new Error(`Cannot calibrate from empty dataset: ${datasetPath}`);
  }

  const denominator =
    positions * sumPredictionSquared - sumPrediction * sumPrediction;
  const rawSlope =
    Math.abs(denominator) < 1e-9
      ? 1
      : (positions * sumPredictionTarget - sumPrediction * sumTarget) /
        denominator;
  const rawIntercept = (sumTarget - rawSlope * sumPrediction) / positions;
  const slope = Math.min(options.maxSlope, Math.max(options.minSlope, rawSlope));
  const intercept = Math.min(
    options.maxIntercept,
    Math.max(options.minIntercept, rawIntercept),
  );

  return {
    positions,
    rawSlope,
    rawIntercept,
    slope,
    intercept,
  };
};

const getGameResult = (engine: ChessEngine): MatchGameResult => {
  if (engine.isCheckmate()) {
    return engine.turn() === COLOR.WHITE ? "0-1" : "1-0";
  }

  if (engine.isDraw() || engine.isStalemate()) {
    return "1/2-1/2";
  }

  return "*";
};

const scoreForEngine = (
  result: MatchGameResult,
  engineColor: typeof COLOR.WHITE | typeof COLOR.BLACK,
): number => {
  if (result === "*" || result === "1/2-1/2") {
    return 0.5;
  }

  if (engineColor === COLOR.WHITE) {
    return result === "1-0" ? 1 : 0;
  }

  return result === "0-1" ? 1 : 0;
};

const estimateElo = (scoreRate: number, opponentElo: number): number => {
  const clippedScore = Math.min(0.99, Math.max(0.01, scoreRate));
  const eloDiff = -400 * Math.log10(1 / clippedScore - 1);

  return Math.round(opponentElo + eloDiff);
};

const scoreToCentipawns = (score: UciScore): number => {
  if (score.type === "cp") {
    return score.value;
  }

  return Math.sign(score.value) * (MATE_SCORE_CP - Math.abs(score.value));
};

const adjudicateFinalPosition = async (
  stockfish: UciClient,
  fen: string,
  depth: number,
  thresholdCp: number,
): Promise<{ result: MatchGameResult; cp: number | null }> => {
  if (depth <= 0) {
    return { result: "*", cp: null };
  }

  const analysis = await stockfish.analyze(fen, { depth });

  if (analysis.score === null) {
    return { result: "*", cp: null };
  }

  const sideToMoveCp = scoreToCentipawns(analysis.score);
  const whiteCp = getFenSideToMove(fen) === "w" ? sideToMoveCp : -sideToMoveCp;

  if (whiteCp >= thresholdCp) {
    return { result: "1-0", cp: whiteCp };
  }

  if (whiteCp <= -thresholdCp) {
    return { result: "0-1", cp: whiteCp };
  }

  return { result: "1/2-1/2", cp: whiteCp };
};

const playMatchGame = async (
  stockfish: UciClient,
  engineColor: typeof COLOR.WHITE | typeof COLOR.BLACK,
  evaluator: SearchEvaluator,
  options: {
    maxPly: number;
    ourDepth: number;
    ourMoveTimeMs: number;
    stockfishMoveTimeMs: number;
    openingMoves: readonly string[];
  },
): Promise<{ result: MatchGameResult; plies: number; finalFen: string }> => {
  const engine = new ChessEngine();
  let plies = options.openingMoves.length;

  for (const move of options.openingMoves) {
    engine.makeUciMove(move);
  }

  for (; plies < options.maxPly && !engine.isGameOver(); plies++) {
    const isEngineTurn = engine.turn() === engineColor;
    const move = isEngineTurn
      ? chooseSearchMove(
          engine.exportFen(),
          options.ourDepth,
          options.ourMoveTimeMs,
          evaluator,
        )
      : await stockfish.getBestMove(
          engine.exportFen(),
          options.stockfishMoveTimeMs,
        );

    if (move === null || move === "0000") {
      break;
    }

    engine.makeUciMove(move);
  }

  return {
    result: getGameResult(engine),
    plies,
    finalFen: engine.exportFen(),
  };
};

const evaluateAgainstStockfish = async (
  label: string,
  model: NnueModel,
  options: {
    stockfishPath: string;
    elos: number[];
    gamesPerElo: number;
    maxPly: number;
    ourDepth: number;
    ourMoveTimeMs: number;
    stockfishMoveTimeMs: number;
    adjudicateDepth: number;
    adjudicateThresholdCp: number;
  },
): Promise<MatchSummary[]> => {
  const stockfish = new UciClient(resolve(options.stockfishPath));
  const evaluator = createNnueEvaluator(model);
  const summaries: MatchSummary[] = [];

  await stockfish.initialize();
  await stockfish.setOption("Threads", "1");
  await stockfish.setOption("Hash", "128");
  await stockfish.setOption("UCI_LimitStrength", "true");

  try {
    for (const elo of options.elos) {
      await stockfish.setOption("UCI_Elo", String(elo));
      await stockfish.setOption("Clear Hash", "");

      let points = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let unfinished = 0;

      for (let gameIndex = 0; gameIndex < options.gamesPerElo; gameIndex++) {
        const engineColor = gameIndex % 2 === 0 ? COLOR.WHITE : COLOR.BLACK;
        const openingIndex =
          Math.trunc(gameIndex / 2) % MATCH_OPENING_LINES.length;
        const game = await playMatchGame(stockfish, engineColor, evaluator, {
          ...options,
          openingMoves: MATCH_OPENING_LINES[openingIndex],
        });

        if (game.result === "*" && options.adjudicateDepth > 0) {
          await stockfish.setOption("UCI_LimitStrength", "false");

          const adjudication = await adjudicateFinalPosition(
            stockfish,
            game.finalFen,
            options.adjudicateDepth,
            options.adjudicateThresholdCp,
          );

          await stockfish.setOption("UCI_LimitStrength", "true");
          await stockfish.setOption("UCI_Elo", String(elo));

          game.result = adjudication.result;
        }

        const score = scoreForEngine(game.result, engineColor);
        const engineResult = getEngineResultLabel(game.result, engineColor);

        points += score;

        if (game.result === "*") {
          unfinished++;
        } else if (game.result === "1/2-1/2") {
          draws++;
        } else if (score === 1) {
          wins++;
        } else {
          losses++;
        }

        console.log(
          `[match:${label}] elo ${elo} game ${gameIndex + 1}/${
            options.gamesPerElo
          } engine ${engineResult} score ${score} color ${
            engineColor === COLOR.WHITE ? "white" : "black"
          } result ${game.result} opening ${openingIndex} plies ${game.plies}`,
        );
      }

      const scoreRate = points / options.gamesPerElo;
      const summary = {
        stockfishElo: elo,
        games: options.gamesPerElo,
        wins,
        draws,
        losses,
        unfinished,
        scoreRate,
        estimatedElo: estimateElo(scoreRate, elo),
      };

      summaries.push(summary);
      console.log(
        `[match:${label}] elo ${elo} summary ${wins}W ${draws}D ${losses}L ` +
          `unfinished ${unfinished} score ${formatDecimal(
            scoreRate * options.gamesPerElo,
            1,
          )}/${options.gamesPerElo} (${formatDecimal(scoreRate * 100, 1)}%) ` +
          `estimated elo ${summary.estimatedElo}`,
      );
    }
  } finally {
    stockfish.close();
  }

  return summaries;
};

const getWeightedScoreRate = (summaries: MatchSummary[]): number => {
  let games = 0;
  let points = 0;

  for (const summary of summaries) {
    games += summary.games;
    points += summary.scoreRate * summary.games;
  }

  return games === 0 ? 0 : points / games;
};

const getTotalGames = (summaries: MatchSummary[]): number =>
  summaries.reduce((total, summary) => total + summary.games, 0);

const printOutputDistribution = (
  label: string,
  distribution: OutputDistributionSummary,
): void => {
  console.log(
    `${label.padEnd(16)} avgAbs ${formatDecimal(
      distribution.averageAbsCp,
    ).padStart(8)} min ${formatDecimal(distribution.minCp, 0).padStart(
      6,
    )} max ${formatDecimal(distribution.maxCp, 0).padStart(6)} ` +
      `=0 ${formatDecimal(distribution.exactZeroPercent, 1).padStart(
        5,
      )}% <10 ${formatDecimal(distribution.absUnder10Percent, 1).padStart(
        5,
      )}% <50 ${formatDecimal(distribution.absUnder50Percent, 1).padStart(5)}%`,
  );
};

const printValidationBuckets = (buckets: ValidationBucketSummary[]): void => {
  console.log(
    "bucket       count   targetAbs  zeroMAE defaultMAE candidateMAE  candAbs",
  );

  for (const bucket of buckets) {
    console.log(
      `${bucket.label.padEnd(10)} ${formatNumber(bucket.positions).padStart(
        7,
      )} ${formatDecimal(bucket.targetAverageAbsCp).padStart(
        10,
      )} ${formatDecimal(bucket.zeroMae).padStart(8)} ${formatDecimal(
        bucket.defaultNnueMae,
      ).padStart(10)} ${formatDecimal(bucket.candidateNnueMae).padStart(
        12,
      )} ${formatDecimal(bucket.candidateAverageAbsCp).padStart(8)}`,
    );
  }
};

const decidePromotion = (options: {
  noPromote: boolean;
  skipGames: boolean;
  allowValidationOnlyPromote: boolean;
  validation: ValidationSummary;
  defaultMatches: MatchSummary[];
  candidateMatches: MatchSummary[];
  minValidationImprovementCp: number;
  maxBucketRegressionCp: number;
  minBucketPositions: number;
  minCandidateTargetAbsRatio: number;
  maxCandidateAbsUnder50Percent: number;
  minPromotionGames: number;
  minMatchScoreImprovement: number;
  nonDefaultBase: boolean;
  allowNonDefaultBasePromote: boolean;
}): PromotionDecision => {
  const reasons: string[] = [];
  const validationImprovement =
    options.validation.defaultNnueMae - options.validation.candidateNnueMae;

  if (options.noPromote) {
    reasons.push("--no-promote was set");
  }

  if (options.nonDefaultBase && !options.allowNonDefaultBasePromote) {
    reasons.push(
      "base is not the active default; use --allow-nondefault-base-promote to permit replacement",
    );
  }

  if (validationImprovement < options.minValidationImprovementCp) {
    reasons.push(
      `validation improvement ${formatDecimal(
        validationImprovement,
      )}cp < required ${formatDecimal(options.minValidationImprovementCp)}cp`,
    );
  }

  for (const bucket of options.validation.buckets) {
    if (bucket.positions < options.minBucketPositions) {
      continue;
    }

    const regression = bucket.candidateNnueMae - bucket.defaultNnueMae;

    if (regression > options.maxBucketRegressionCp) {
      reasons.push(
        `bucket ${bucket.label} regressed ${formatDecimal(
          regression,
        )}cp > allowed ${formatDecimal(options.maxBucketRegressionCp)}cp`,
      );
    }
  }

  const targetAbs = options.validation.targetOutput.averageAbsCp;
  const candidateAbs = options.validation.candidateOutput.averageAbsCp;
  const candidateTargetAbsRatio = targetAbs === 0 ? 1 : candidateAbs / targetAbs;

  if (candidateTargetAbsRatio < options.minCandidateTargetAbsRatio) {
    reasons.push(
      `candidate avgAbs/target avgAbs ${formatDecimal(
        candidateTargetAbsRatio,
        3,
      )} < required ${formatDecimal(options.minCandidateTargetAbsRatio, 3)}`,
    );
  }

  if (
    options.validation.candidateOutput.absUnder50Percent >
    options.maxCandidateAbsUnder50Percent
  ) {
    reasons.push(
      `candidate abs<50 ${formatDecimal(
        options.validation.candidateOutput.absUnder50Percent,
        1,
      )}% > allowed ${formatDecimal(options.maxCandidateAbsUnder50Percent, 1)}%`,
    );
  }

  if (options.skipGames) {
    if (!options.allowValidationOnlyPromote) {
      reasons.push("games were skipped; use --allow-validation-only-promote to permit promotion");
    }
  } else {
    const defaultScoreRate = getWeightedScoreRate(options.defaultMatches);
    const candidateScoreRate = getWeightedScoreRate(options.candidateMatches);
    const matchImprovement = candidateScoreRate - defaultScoreRate;
    const totalGames = getTotalGames(options.candidateMatches);

    if (totalGames < options.minPromotionGames) {
      reasons.push(
        `candidate match games ${totalGames} < required ${options.minPromotionGames}`,
      );
    }

    if (matchImprovement < options.minMatchScoreImprovement) {
      reasons.push(
        `match score improvement ${formatDecimal(
          matchImprovement * 100,
          1,
        )}pp < required ${formatDecimal(
          options.minMatchScoreImprovement * 100,
          1,
        )}pp`,
      );
    }
  }

  return {
    promoted: reasons.length === 0,
    reasons,
  };
};

const printHelp = (): void => {
  console.log(`NNUE training

Usage:
  npm run nnue:train -- [options]

Common options:
  --data <path>                  Lichess eval .jsonl.zst path
  --backend <tensor|scalar>      Native batched or reference scalar trainer
  --base <material|default|path> Starting checkpoint; defaults to material
  --reuse-dataset <dir>          Reuse train.jsonl and validation.jsonl
  --positions <n>                Training positions
  --validation-positions <n>     Held-out validation positions
  --epochs <n>                   Training epochs
  --batch-size <n>               Tensor batch size, defaults to 1024
  --psqt-epochs <n>              Fast sparse PSQT bootstrap epochs
  --network-epochs <n>           Dense-network-only tensor epochs
  --feature-epochs <n>           HalfKA transformer tensor epochs
  --train-full-threats           Cache and train expensive FullThreat features
  --sample-multiplier <n>        Spread samples across more accepted rows
  --shuffle-buffer <n>           Local shuffle buffer size
  --validate-legal-positions     Run full legal-move validation while sampling
  --train-reeval-positions <n>   Training records to re-evaluate post-export
  --loss <cp|wdl|mixed>          Training loss, defaults to mixed
  --float-epochs <n>             Float-forward epochs, defaults to epochs minus QAT
  --qat-epochs <n>               Quantized-forward fine-tune epochs
  --threat-warmup-epochs <n>     Float epochs before FullThreat weights update
  --learning-rate <n>            Base learning rate
  --network-learning-rate <n>    Dense layer learning rate
  --feature-learning-rate <n>    HalfKA feature learning rate
  --threat-learning-rate <n>     FullThreat feature learning rate
  --psqt-learning-rate <n>       PSQT learning rate
  --bias-learning-rate <n>       Bias learning rate
  --wdl-scale <n>                CP scale for logistic WDL loss
  --cp-loss-weight <n>           Huber CP term weight for mixed loss
  --bucket-weighting             Mildly upweight decisive labels
  --calibration-positions <n>    Training records used to fit output scale
  --calibrate-output             Fit final output scale (experimental)
  --games-per-elo <n>            Stockfish games per Elo
  --elos <list>                  Comma-separated Stockfish Elo list
  --min-promotion-games <n>      Minimum candidate games before auto-promotion
  --min-validation-improvement-cp <n>
                                  Required candidate validation improvement
  --skip-games                   Skip Stockfish game evaluation
  --allow-validation-only-promote
                                  Permit promotion when games are skipped
  --allow-nondefault-base-promote Permit a material/path base to replace default
  --no-promote                   Never replace the default checkpoint

Docs:
  docs/nnue-training.md`);
};

const run = async (): Promise<void> => {
  if (hasArg("--help") || hasArg("-h")) {
    printHelp();

    return;
  }

  const inputPath = getArg("--data", "lichess_data/lichess_db_eval.jsonl.zst");
  const backend = getArg("--backend", "tensor");

  if (backend !== "tensor" && backend !== "scalar") {
    throw new Error(`Invalid --backend: ${backend}. Expected tensor or scalar.`);
  }

  const outputDirectory = resolve(
    getArg("--output-dir", `models/nnue/runs/${getTimestamp()}`),
  );
  let trainPath = resolve(outputDirectory, "train.jsonl");
  let validationPath = resolve(outputDirectory, "validation.jsonl");
  const checkpointDirectory = resolve(outputDirectory, "checkpoints");
  const positions = getNumberArg("--positions", 100_000);
  const validationPositions = getNumberArg(
    "--validation-positions",
    Math.min(10_000, Math.max(1_000, Math.trunc(positions / 10))),
  );
  const epochs = getNumberArg("--epochs", 1);
  const seed = getNumberArg("--seed", Date.now());
  const minDepth = getNumberArg("--min-depth", 18);
  const maxAbsCp = getNumberArg("--max-abs-cp", 3_000);
  const sampleMultiplier = getNumberArg("--sample-multiplier", 4);
  const shuffleBuffer = getNumberArg("--shuffle-buffer", 20_000);
  const logEvery = getNumberArg("--log-every", 10_000);
  const trainReevalPositions = Math.min(
    positions,
    Math.max(
      0,
      Math.trunc(
        getNumberArg(
          "--train-reeval-positions",
          backend === "tensor" ? Math.min(10_000, positions) : positions,
        ),
      ),
    ),
  );
  const baseLearningRate = getNumberArg("--learning-rate", 0.02);
  const loss = parseTrainingLoss(getArg("--loss", "mixed"));
  const qatEpochs = Math.max(
    0,
    Math.trunc(getNumberArg("--qat-epochs", epochs >= 2 ? 1 : 0)),
  );
  const floatEpochs = Math.max(
    0,
    Math.trunc(getNumberArg("--float-epochs", Math.max(0, epochs - qatEpochs))),
  );
  const threatWarmupEpochs = Math.min(
    floatEpochs,
    Math.max(
      0,
      Math.trunc(getNumberArg("--threat-warmup-epochs", floatEpochs >= 2 ? 1 : 0)),
    ),
  );
  const qatLearningRateScale = getNumberArg("--qat-learning-rate-scale", 0.25);
  const baseRates = {
    network: getNumberArg("--network-learning-rate", baseLearningRate),
    feature: getNumberArg("--feature-learning-rate", baseLearningRate * 0.4),
    threat: getNumberArg("--threat-learning-rate", baseLearningRate * 0.2),
    psqt: getNumberArg("--psqt-learning-rate", baseLearningRate * 4),
    bias: getNumberArg("--bias-learning-rate", baseLearningRate * 4),
  };
  const baseTrainingOptions: Omit<
    NnueTrainingOptions,
    "quantizeForward" | "trainFullThreats"
  > = {
    rates: baseRates,
    loss,
    targetClamp: getNumberArg("--target-clamp", maxAbsCp),
    errorClamp: getNumberArg("--error-clamp", 200),
    wdlScale: getNumberArg("--wdl-scale", 400),
    wdlGradientScale: getNumberArg("--wdl-gradient-scale", 800),
    cpLossWeight: getNumberArg("--cp-loss-weight", 0.01),
    cpHuberDelta: getNumberArg("--cp-huber-delta", 300),
    bucketWeighting:
      hasArg("--bucket-weighting") && !hasArg("--no-bucket-weighting"),
  };
  const trainingPhases: TrainingPhase[] = [];
  const fullFloatEpochs = floatEpochs - threatWarmupEpochs;

  if (threatWarmupEpochs > 0) {
    trainingPhases.push({
      name: "float-warmup",
      epochs: threatWarmupEpochs,
      quantizeForward: false,
      options: {
        ...baseTrainingOptions,
        quantizeForward: false,
        trainFullThreats: false,
      },
    });
  }

  if (fullFloatEpochs > 0) {
    trainingPhases.push({
      name: "float",
      epochs: fullFloatEpochs,
      quantizeForward: false,
      options: {
        ...baseTrainingOptions,
        quantizeForward: false,
        trainFullThreats: true,
      },
    });
  }

  if (qatEpochs > 0) {
    trainingPhases.push({
      name: "qat",
      epochs: qatEpochs,
      quantizeForward: true,
      options: {
        ...baseTrainingOptions,
        rates: scaleTrainingRates(baseRates, qatLearningRateScale),
        quantizeForward: true,
        trainFullThreats: true,
      },
    });
  }

  if (backend === "scalar" && trainingPhases.length === 0) {
    throw new Error("At least one float or QAT epoch is required.");
  }

  await mkdir(checkpointDirectory, { recursive: true });

  logSection("Base Checkpoint");
  const base = getArg("--base", "material");
  const defaultCheckpointPath =
    base === "material"
      ? "material-seeded"
      : base === "default"
        ? await ensureDefaultNnueCheckpoint()
        : resolve(base);
  const defaultModel =
    base === "material"
      ? createMaterialNnueModel({
          ...DEFAULT_NNUE_MODEL_METADATA,
          id: "material-seeded-nnue-v1",
          createdAt: new Date().toISOString(),
          source: "material-seeded",
        })
      : await loadNnueModel(defaultCheckpointPath);

  console.log(`base: ${defaultCheckpointPath}`);
  console.log(`model id: ${defaultModel.metadata.id}`);

  logSection("Dataset");
  const reuseDatasetDirectory = getArg("--reuse-dataset", "");
  const datasetSummary =
    reuseDatasetDirectory.length > 0
      ? await reuseTrainingDataset(reuseDatasetDirectory)
      : await createTrainingDataset(
          inputPath,
          trainPath,
          validationPath,
          {
            positions,
            validationPositions,
            minDepth,
            maxAbsCp,
            sampleMultiplier,
            shuffleBuffer,
            seed,
            logEvery,
            includeFullThreats:
              backend === "scalar" ||
              hasArg("--train-full-threats") ||
              defaultModel.metadata.fullThreats !== false,
            validateLegalMoves:
              backend === "scalar" || hasArg("--validate-legal-positions"),
          },
        );

  trainPath = datasetSummary.trainPath;
  validationPath = datasetSummary.validationPath;

  console.log(
    `train ${formatNumber(datasetSummary.trainPositions)} validation ${formatNumber(
      datasetSummary.validationPositions,
    )} read ${formatNumber(datasetSummary.read)} skipped ${formatNumber(
      datasetSummary.skipped,
    )} mates ${formatNumber(datasetSummary.skippedMate)} out-of-range ${formatNumber(
      datasetSummary.skippedOutOfRange,
    )} checks ${formatNumber(datasetSummary.skippedCheck)} invalid ${formatNumber(
      datasetSummary.skippedInvalidPosition,
    )} sampled-out ${formatNumber(datasetSummary.skippedSampling)}`,
  );

  logSection("Training");
  let candidateModel: NnueModel;
  let calibration: CalibrationSummary | null = null;
  let scalarFinalEpochSummary: EpochSummary | null = null;
  let epochSummaries: Array<EpochSummary | TensorTrainingEpochSummary> = [];

  const candidateMetadata = {
    ...defaultModel.metadata,
    id: `${defaultModel.metadata.id}-candidate`,
    createdAt: new Date().toISOString(),
    source: `lichess-eval:${basename(inputPath)}`,
    estimatedElo: null,
  };

  if (backend === "tensor") {
    const psqtEpochs = Math.max(
      0,
      Math.trunc(getNumberArg("--psqt-epochs", 1)),
    );
    const networkEpochs = Math.max(
      0,
      Math.trunc(getNumberArg("--network-epochs", 1)),
    );
    const featureEpochs = Math.max(
      0,
      Math.trunc(getNumberArg("--feature-epochs", epochs)),
    );
    const fullThreatEpochs = hasArg("--train-full-threats")
      ? Math.max(1, Math.trunc(getNumberArg("--full-threat-epochs", 1)))
      : 0;
    const useExistingFullThreats = defaultModel.metadata.fullThreats !== false;
    const tensorPhases: TensorTrainingPhase[] = [];

    if (psqtEpochs > 0) {
      tensorPhases.push({
        name: "psqt",
        epochs: psqtEpochs,
        learningRate: getNumberArg("--psqt-tensor-learning-rate", 1),
        trainFeatureTransformer: false,
        trainNetwork: false,
        trainPsqt: true,
        trainFullThreats: false,
        useNetwork: false,
        useFullThreats: false,
      });
    }

    if (networkEpochs > 0) {
      tensorPhases.push({
        name: "network",
        epochs: networkEpochs,
        learningRate: getNumberArg("--network-tensor-learning-rate", 0.1),
        trainFeatureTransformer: false,
        trainNetwork: true,
        trainPsqt: true,
        trainFullThreats: false,
        useNetwork: true,
        useFullThreats: useExistingFullThreats,
      });
    }

    if (featureEpochs > 0) {
      tensorPhases.push({
        name: "halfka",
        epochs: featureEpochs,
        learningRate: getNumberArg("--feature-tensor-learning-rate", 0.02),
        trainFeatureTransformer: true,
        trainNetwork: true,
        trainPsqt: true,
        trainFullThreats: false,
        useNetwork: true,
        useFullThreats: useExistingFullThreats,
      });
    }

    if (fullThreatEpochs > 0) {
      tensorPhases.push({
        name: "full-threats",
        epochs: fullThreatEpochs,
        learningRate: getNumberArg("--threat-tensor-learning-rate", 0.01),
        trainFeatureTransformer: false,
        trainNetwork: true,
        trainPsqt: true,
        trainFullThreats: true,
        useNetwork: true,
        useFullThreats: true,
      });
    }

    if (tensorPhases.length === 0) {
      throw new Error("At least one tensor training phase is required.");
    }

    const includeFullThreats = tensorPhases.some(
      (phase) => phase.useFullThreats || phase.trainFullThreats,
    );
    const featureCachePath = resolve(outputDirectory, "train.features.bin");

    console.log(
      `backend tensor batch ${formatNumber(
        getNumberArg("--batch-size", 1_024),
      )} fullThreats ${includeFullThreats ? "yes" : "no"}`,
    );
    const featureCache = await createFeatureCache(trainPath, featureCachePath, {
      includeFullThreats,
      logEvery,
      onProgress: (cached, elapsedMs) => {
        const positionsPerSecond = cached / Math.max(0.001, elapsedMs / 1_000);

        console.log(
          `[features] ${formatNumber(cached)}/${formatNumber(
            datasetSummary.trainPositions,
          )} ${formatNumber(positionsPerSecond)} pos/s`,
        );
      },
    });

    if (featureCache.positions !== datasetSummary.trainPositions) {
      console.log(
        `[features] filtered ${formatNumber(
          datasetSummary.trainPositions - featureCache.positions,
        )} implausible positions`,
      );
    }

    const totalEpochs = tensorPhases.reduce(
      (total, phase) => total + phase.epochs,
      0,
    );
    const result = await trainTensorNnue(
      defaultModel,
      featureCachePath,
      {
        ...candidateMetadata,
        trainingPositions:
          defaultModel.metadata.trainingPositions +
          featureCache.positions * totalEpochs,
      },
      {
        batchSize: Math.max(
          1,
          Math.trunc(getNumberArg("--batch-size", 1_024)),
        ),
        seed,
        targetClamp: baseTrainingOptions.targetClamp,
        loss,
        wdlScale: baseTrainingOptions.wdlScale,
        wdlGradientScale: baseTrainingOptions.wdlGradientScale,
        cpLossWeight: baseTrainingOptions.cpLossWeight,
        cpHuberDelta: baseTrainingOptions.cpHuberDelta,
        bucketWeighting: baseTrainingOptions.bucketWeighting,
        phases: tensorPhases,
        logEvery,
        onProgress: (progress) => {
          console.log(
            `[train] ${progress.phase} epoch ${progress.epoch} ` +
              `${formatNumber(progress.positions)}/${formatNumber(
                progress.totalPositions,
              )} loss ${formatDecimal(progress.meanLoss, 2)} ` +
              `${formatNumber(progress.positionsPerSecond)} pos/s`,
          );
        },
      },
    );

    candidateModel = result.model;
    epochSummaries = result.epochs;
  } else {
    const trainableWeights = createTrainableNnueWeights(defaultModel);
    const scalarEpochSummaries: EpochSummary[] = [];

    console.log(
      `backend scalar loss ${loss} floatEpochs ${floatEpochs} ` +
        `qatEpochs ${qatEpochs} threatWarmupEpochs ${threatWarmupEpochs}`,
    );

    for (const phase of trainingPhases) {
      console.log(
        `[train] phase ${phase.name} epochs ${phase.epochs} ` +
          `quantizedForward ${phase.quantizeForward ? "yes" : "no"} ` +
          `fullThreats ${phase.options.trainFullThreats ? "yes" : "no"}`,
      );

      for (let epoch = 1; epoch <= phase.epochs; epoch++) {
        const epochSummary = await trainEpoch(
          trainPath,
          phase.name,
          epoch,
          {
            ...phase.options,
            logEvery,
            positions: datasetSummary.trainPositions,
          },
          trainableWeights,
        );

        scalarEpochSummaries.push(epochSummary);
        console.log(
          `[train] ${phase.name} epoch ${epoch} complete mae ${formatDecimal(
            epochSummary.meanAbsoluteError,
          )} rmse ${formatDecimal(
            epochSummary.rootMeanSquaredError,
          )} loss ${formatDecimal(epochSummary.meanLoss, 4)} wdl ${formatDecimal(
            epochSummary.meanWdlError,
            4,
          )}`,
        );
      }
    }

    const calibrationPositions = Math.min(
      datasetSummary.trainPositions,
      Math.max(
        0,
        Math.trunc(
          getNumberArg(
            "--calibration-positions",
            datasetSummary.trainPositions,
          ),
        ),
      ),
    );

    calibration =
      hasArg("--calibrate-output") &&
      !hasArg("--no-calibrate-output") &&
      calibrationPositions > 0
        ? await fitOutputCalibration(trainPath, trainableWeights, {
            maxPositions: calibrationPositions,
            minSlope: getNumberArg("--min-output-calibration-slope", 0.5),
            maxSlope: getNumberArg("--max-output-calibration-slope", 4),
            minIntercept: getNumberArg(
              "--min-output-calibration-intercept",
              -200,
            ),
            maxIntercept: getNumberArg(
              "--max-output-calibration-intercept",
              200,
            ),
            logEvery,
          })
        : null;

    if (calibration !== null) {
      logSection("Output Calibration");
      console.log(
        `positions ${formatNumber(calibration.positions)} raw slope ${formatDecimal(
          calibration.rawSlope,
          3,
        )} raw intercept ${formatDecimal(calibration.rawIntercept)} ` +
          `applied slope ${formatDecimal(calibration.slope, 3)} ` +
          `applied intercept ${formatDecimal(calibration.intercept)}`,
      );
      applyOutputCalibration(trainableWeights, calibration);
    }

    candidateModel = writeTrainableWeightsToModel(
      {
        ...defaultModel,
        metadata: {
          ...candidateMetadata,
          fullThreats:
            defaultModel.metadata.fullThreats !== false ||
            trainingPhases.some((phase) => phase.options.trainFullThreats),
          network: true,
          trainingPositions:
            defaultModel.metadata.trainingPositions +
            datasetSummary.trainPositions * scalarEpochSummaries.length,
        },
      },
      trainableWeights,
    );
    epochSummaries = scalarEpochSummaries;
    scalarFinalEpochSummary =
      scalarEpochSummaries[scalarEpochSummaries.length - 1] ?? null;
  }

  const candidateCheckpointPath = await writeNnueCheckpoint(
    candidateModel,
    checkpointDirectory,
  );

  console.log(`candidate checkpoint: ${candidateCheckpointPath}`);

  logSection("Post-Export Re-evaluation");
  const trainReeval =
    trainReevalPositions > 0
      ? await evaluateNnueDatasetMae(
          trainPath,
          candidateModel,
          trainReevalPositions,
          logEvery,
          "train-reeval",
        )
      : null;

  if (scalarFinalEpochSummary !== null) {
    console.log(
      `train online MAE:              ${formatDecimal(
        scalarFinalEpochSummary.meanAbsoluteError,
      )}`,
    );
  } else {
    console.log("train online MAE:              batched; use post-export MAE");
  }

  if (trainReeval !== null) {
    console.log(
      `candidate train reeval MAE:   ${formatDecimal(
        trainReeval.meanAbsoluteError,
      )} (${formatNumber(trainReeval.positions)} positions)`,
    );
  } else {
    console.log("candidate train reeval MAE:   skipped");
  }

  logSection("Validation");
  const validation = await evaluateValidation(
    validationPath,
    defaultModel,
    candidateModel,
  );

  console.log(`positions: ${formatNumber(validation.positions)}`);
  console.log(`zero eval MAE:       ${formatDecimal(validation.zeroMae)}`);
  console.log(`material eval MAE:   ${formatDecimal(validation.materialMae)}`);
  console.log(`default NNUE MAE:   ${formatDecimal(validation.defaultNnueMae)}`);
  console.log(`candidate NNUE MAE: ${formatDecimal(validation.candidateNnueMae)}`);

  console.log("\nOutput distribution:");
  printOutputDistribution("target", validation.targetOutput);
  printOutputDistribution("default NNUE", validation.defaultOutput);
  printOutputDistribution("candidate NNUE", validation.candidateOutput);

  console.log("\nBucketed validation:");
  printValidationBuckets(validation.buckets);

  let defaultMatches: MatchSummary[] = [];
  let candidateMatches: MatchSummary[] = [];

  const skipGames = hasArg("--skip-games");

  if (!skipGames) {
    logSection("Stockfish Evaluation");

    const matchOptions = {
      stockfishPath: getArg("--stockfish", "engines/stockfish/src/stockfish"),
      elos: parseEloList(getArg("--elos", "1320")),
      gamesPerElo: getNumberArg("--games-per-elo", 32),
      maxPly: getNumberArg("--max-ply", 100),
      ourDepth: getNumberArg("--our-depth", 4),
      ourMoveTimeMs: getNumberArg("--our-movetime", 50),
      stockfishMoveTimeMs: getNumberArg("--stockfish-movetime", 50),
      adjudicateDepth: getNumberArg("--adjudicate-depth", 8),
      adjudicateThresholdCp: getNumberArg("--adjudicate-threshold-cp", 600),
    };

    defaultMatches = await evaluateAgainstStockfish(
      "default",
      defaultModel,
      matchOptions,
    );
    candidateMatches = await evaluateAgainstStockfish(
      "candidate",
      candidateModel,
      matchOptions,
    );
  }

  const promotionDecision = decidePromotion({
    noPromote: hasArg("--no-promote"),
    skipGames,
    allowValidationOnlyPromote: hasArg("--allow-validation-only-promote"),
    validation,
    defaultMatches,
    candidateMatches,
    minValidationImprovementCp: getNumberArg("--min-validation-improvement-cp", 5),
    maxBucketRegressionCp: getNumberArg("--max-bucket-regression-cp", 10),
    minBucketPositions: Math.trunc(getNumberArg("--min-bucket-positions", 500)),
    minCandidateTargetAbsRatio: getNumberArg("--min-candidate-target-abs-ratio", 0.35),
    maxCandidateAbsUnder50Percent: getNumberArg(
      "--max-candidate-abs-under-50-percent",
      85,
    ),
    minPromotionGames: Math.trunc(getNumberArg("--min-promotion-games", 64)),
    minMatchScoreImprovement: getNumberArg("--min-match-score-improvement", 0.02),
    nonDefaultBase: base !== "default",
    allowNonDefaultBasePromote: hasArg("--allow-nondefault-base-promote"),
  });
  const promoted = promotionDecision.promoted;

  if (promoted) {
    const promotedPath = await promoteDefaultNnueCheckpoint(candidateCheckpointPath);

    console.log(`promoted: ${promotedPath}`);
  } else {
    console.log("promoted: no");

    for (const reason of promotionDecision.reasons) {
      console.log(`promotion block: ${reason}`);
    }
  }

  const report = {
    createdAt: new Date().toISOString(),
    outputDirectory,
    defaultCheckpointPath,
    candidateCheckpointPath,
    promoted,
    dataset: datasetSummary,
    epochs: epochSummaries,
    calibration,
    trainReeval,
    validation,
    defaultMatches,
    candidateMatches,
    promotionDecision,
  };

  await writeFile(
    resolve(outputDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
};

await run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
