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
import { createNnueScratch } from "../../src/search/nnue/scratch";
import type { AttackInfo } from "../../src/engine/types/attackInfo";
import type { MoveGenerationContext, MoveList } from "../../src/engine/types/move";
import type { Position } from "../../src/engine/types/position";
import type { NnueModel, SearchEvaluator } from "../../src/search/types/nnue";
import { getArg, getNumberArg, hasArg } from "./args";
import { createJsonlWriter } from "./jsonl";
import {
  ensureDefaultNnueCheckpoint,
  getTimestamp,
  loadNnueModel,
  promoteDefaultNnueCheckpoint,
  writeNnueCheckpoint,
} from "./modelFiles";
import { chooseSearchMove } from "./searchMoves";
import {
  trainNnueRecord,
  writeTrainableWeightsToModel,
  type NnueTrainingLoss,
  type NnueTrainingOptions,
  type TrainingRecord,
} from "./trainingPass";
import { createNnueTrainingScratch } from "./trainingScratch";
import { createTrainableNnueWeights } from "./trainingWeights";
import { UciEngine, type UciScore } from "./uciEngine";

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
  simpleMae: number;
  defaultNnueMae: number;
  candidateNnueMae: number;
};

type NnueDatasetMaeSummary = {
  positions: number;
  meanAbsoluteError: number;
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
): void => {
  appendHalfKaActiveFeatures(position, COLOR.WHITE, scratch.halfKaFeatures, 0);
  appendHalfKaActiveFeatures(position, COLOR.BLACK, scratch.halfKaFeatures, 0);
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
): { isCheck: boolean; isTerminal: boolean } => {
  const position = generateFenToPosition(fen);

  assertNnueEncodablePosition(position, scratch);

  const ctx = getMoveGenerationContext(position, scratch.moveList, scratch.ctx);
  const attackInfo = generateAttackInfo(ctx, scratch.attackInfo);
  const legalMoveCount = generateLegalMovesFromContext(ctx, attackInfo);

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

  const positionFilter = getPositionFilter(fen, scratch);

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
  const [record] = buffer.splice(index, 1);

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

    while (trainBuffer.length > 0) {
      await flushRandomTrainingRecord(trainBuffer, random, writeTrain);
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

const readTrainingRecord = (line: string): TrainingRecord => {
  const record = JSON.parse(line) as TrainingRecord;

  if (typeof record.fen !== "string" || !Number.isFinite(record.scoreCp)) {
    throw new Error(`Invalid training record: ${line}`);
  }

  return record;
};

const addLoss = (
  metrics: { positions: number; absoluteErrorTotal: number; squaredErrorTotal: number },
  loss: NnueTrainingLoss,
): void => {
  metrics.positions++;
  metrics.absoluteErrorTotal += loss.absoluteError;
  metrics.squaredErrorTotal += loss.squaredError;
};

const trainEpoch = async (
  datasetPath: string,
  epoch: number,
  options: NnueTrainingOptions & { logEvery: number; positions: number },
  weights: ReturnType<typeof createTrainableNnueWeights>,
): Promise<{ positions: number; meanAbsoluteError: number; rootMeanSquaredError: number }> => {
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
        `epoch ${epoch} mae ${formatDecimal(
          metrics.absoluteErrorTotal / metrics.positions,
        )} rmse ${formatDecimal(
          Math.sqrt(metrics.squaredErrorTotal / metrics.positions),
        )}`,
      );
    }
  }

  return {
    positions: metrics.positions,
    meanAbsoluteError: metrics.absoluteErrorTotal / metrics.positions,
    rootMeanSquaredError: Math.sqrt(
      metrics.squaredErrorTotal / metrics.positions,
    ),
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
  let positions = 0;
  let zeroError = 0;
  let simpleError = 0;
  let defaultError = 0;
  let candidateError = 0;

  for await (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const record = readTrainingRecord(line);
    const position = generateFenToPosition(record.fen);

    positions++;
    zeroError += Math.abs(record.scoreCp);
    simpleError += Math.abs(simpleEval(position) - record.scoreCp);
    defaultError += Math.abs(
      evaluateNnue(defaultModel, position, defaultScratch) - record.scoreCp,
    );
    candidateError += Math.abs(
      evaluateNnue(candidateModel, position, candidateScratch) - record.scoreCp,
    );
  }

  return {
    positions,
    zeroMae: zeroError / positions,
    simpleMae: simpleError / positions,
    defaultNnueMae: defaultError / positions,
    candidateNnueMae: candidateError / positions,
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
  stockfish: UciEngine,
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
  stockfish: UciEngine,
  engineColor: typeof COLOR.WHITE | typeof COLOR.BLACK,
  evaluator: SearchEvaluator,
  options: {
    maxPly: number;
    ourDepth: number;
    ourMoveTimeMs: number;
    stockfishMoveTimeMs: number;
  },
): Promise<{ result: MatchGameResult; plies: number; finalFen: string }> => {
  const engine = new ChessEngine();
  let plies = 0;

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
  const stockfish = new UciEngine(resolve(options.stockfishPath));
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
        const game = await playMatchGame(stockfish, engineColor, evaluator, options);

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
          } result ${game.result} plies ${game.plies}`,
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

const printHelp = (): void => {
  console.log(`NNUE training

Usage:
  npm run nnue:train -- [options]

Common options:
  --data <path>                  Lichess eval .jsonl.zst path
  --positions <n>                Training positions
  --validation-positions <n>     Held-out validation positions
  --epochs <n>                   Training epochs
  --sample-multiplier <n>        Spread samples across more accepted rows
  --shuffle-buffer <n>           Local shuffle buffer size
  --train-reeval-positions <n>   Training records to re-evaluate post-export
  --learning-rate <n>            Base learning rate
  --network-learning-rate <n>    Dense layer learning rate
  --feature-learning-rate <n>    HalfKA feature learning rate
  --threat-learning-rate <n>     FullThreat feature learning rate
  --psqt-learning-rate <n>       PSQT learning rate
  --bias-learning-rate <n>       Bias learning rate
  --games-per-elo <n>            Stockfish games per Elo
  --elos <list>                  Comma-separated Stockfish Elo list
  --skip-games                   Skip Stockfish game evaluation
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
  const outputDirectory = resolve(
    getArg("--output-dir", `models/nnue/runs/${getTimestamp()}`),
  );
  const trainPath = resolve(outputDirectory, "train.jsonl");
  const validationPath = resolve(outputDirectory, "validation.jsonl");
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
    Math.max(0, Math.trunc(getNumberArg("--train-reeval-positions", positions))),
  );
  const baseLearningRate = getNumberArg("--learning-rate", 0.0005);
  const trainingOptions: NnueTrainingOptions = {
    rates: {
      network: getNumberArg("--network-learning-rate", baseLearningRate),
      feature: getNumberArg("--feature-learning-rate", baseLearningRate * 0.1),
      threat: getNumberArg("--threat-learning-rate", baseLearningRate * 0.05),
      psqt: getNumberArg("--psqt-learning-rate", baseLearningRate * 10),
      bias: getNumberArg("--bias-learning-rate", baseLearningRate * 10),
    },
    targetClamp: getNumberArg("--target-clamp", maxAbsCp),
    errorClamp: getNumberArg("--error-clamp", 200),
  };

  await mkdir(checkpointDirectory, { recursive: true });

  logSection("Default Checkpoint");
  const defaultCheckpointPath = await ensureDefaultNnueCheckpoint();
  const defaultModel = await loadNnueModel(defaultCheckpointPath);

  console.log(`default: ${defaultCheckpointPath}`);
  console.log(`model id: ${defaultModel.metadata.id}`);

  logSection("Dataset");
  const datasetSummary = await createTrainingDataset(
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
    },
  );

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
  const trainableWeights = createTrainableNnueWeights(defaultModel);
  const epochSummaries = [];

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const epochSummary = await trainEpoch(
      trainPath,
      epoch,
      { ...trainingOptions, logEvery, positions },
      trainableWeights,
    );

    epochSummaries.push(epochSummary);
    console.log(
      `[train] epoch ${epoch} complete mae ${formatDecimal(
        epochSummary.meanAbsoluteError,
      )} rmse ${formatDecimal(epochSummary.rootMeanSquaredError)}`,
    );
  }

  const candidateModel = writeTrainableWeightsToModel(
    {
      ...defaultModel,
      metadata: {
        ...defaultModel.metadata,
        id: `${defaultModel.metadata.id}-candidate`,
        createdAt: new Date().toISOString(),
        source: `lichess-eval:${basename(inputPath)}`,
        estimatedElo: null,
        trainingPositions: defaultModel.metadata.trainingPositions + positions * epochs,
      },
    },
    trainableWeights,
  );
  const candidateCheckpointPath = await writeNnueCheckpoint(
    candidateModel,
    checkpointDirectory,
  );

  console.log(`candidate checkpoint: ${candidateCheckpointPath}`);

  logSection("Post-Export Re-evaluation");
  const finalEpochSummary = epochSummaries[epochSummaries.length - 1];
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

  console.log(
    `train online MAE:              ${formatDecimal(
      finalEpochSummary.meanAbsoluteError,
    )}`,
  );

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
  console.log(`simpleEval MAE:     ${formatDecimal(validation.simpleMae)}`);
  console.log(`default NNUE MAE:   ${formatDecimal(validation.defaultNnueMae)}`);
  console.log(`candidate NNUE MAE: ${formatDecimal(validation.candidateNnueMae)}`);

  let defaultMatches: MatchSummary[] = [];
  let candidateMatches: MatchSummary[] = [];

  if (!hasArg("--skip-games")) {
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

  const validationImproved =
    validation.candidateNnueMae < validation.defaultNnueMae;
  const gamesImproved =
    candidateMatches.length === 0 ||
    getWeightedScoreRate(candidateMatches) >= getWeightedScoreRate(defaultMatches);
  const promoted =
    !hasArg("--no-promote") && validationImproved && gamesImproved;

  if (promoted) {
    const promotedPath = await promoteDefaultNnueCheckpoint(candidateCheckpointPath);

    console.log(`promoted: ${promotedPath}`);
  } else {
    console.log("promoted: no");
  }

  const report = {
    createdAt: new Date().toISOString(),
    outputDirectory,
    defaultCheckpointPath,
    candidateCheckpointPath,
    promoted,
    dataset: datasetSummary,
    epochs: epochSummaries,
    trainReeval,
    validation,
    defaultMatches,
    candidateMatches,
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
