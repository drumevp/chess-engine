import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import { COLOR } from "../../src/engine/constants/color";
import { createNnueEvaluator } from "../../src/search/nnue/inference";
import { getArg, getNumberArg, hasArg } from "./args";
import {
  getModelLabel,
  loadNnueModel,
  writeNnueCheckpoint,
} from "./modelFiles";
import { chooseSearchMove } from "./searchMoves";
import { MATCH_OPENING_LINES } from "./matchOpenings";
import { UciEngine } from "./uciEngine";

type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

const getGameResult = (engine: ChessEngine): GameResult => {
  if (engine.isCheckmate()) {
    return engine.turn() === COLOR.WHITE ? "0-1" : "1-0";
  }

  if (engine.isDraw() || engine.isStalemate()) {
    return "1/2-1/2";
  }

  return "*";
};

const scoreForCandidate = (
  result: GameResult,
  candidateColor: 0 | 1,
): number => {
  if (result === "*" || result === "1/2-1/2") {
    return 0.5;
  }

  if (candidateColor === COLOR.WHITE) {
    return result === "1-0" ? 1 : 0;
  }

  return result === "0-1" ? 1 : 0;
};

const getCandidateResult = (
  result: GameResult,
  candidateColor: 0 | 1,
): "win" | "draw" | "loss" | "unfinished" => {
  if (result === "*") {
    return "unfinished";
  }

  if (result === "1/2-1/2") {
    return "draw";
  }

  return scoreForCandidate(result, candidateColor) === 1 ? "win" : "loss";
};

const estimateElo = (scoreRate: number, opponentElo: number): number => {
  const clippedScore = Math.min(0.99, Math.max(0.01, scoreRate));
  const eloDiff = -400 * Math.log10(1 / clippedScore - 1);

  return Math.round(opponentElo + eloDiff);
};

const modelPath = getArg("--model", "default");
const model = await loadNnueModel(modelPath);
const evaluator = createNnueEvaluator(model);
const stockfishPath = resolve(
  getArg("--stockfish", "engines/stockfish/src/stockfish"),
);
const games = getNumberArg("--games", 4);
const maxPly = getNumberArg("--max-ply", 160);
const ourDepth = getNumberArg("--our-depth", 4);
const ourMoveTimeMs = getNumberArg("--our-movetime", 50);
const stockfishMoveTimeMs = getNumberArg("--stockfish-movetime", 50);
const opponentElo = Math.max(1320, getNumberArg("--opponent-elo", 1320));
const outputPath = resolve(
  getArg("--output", `models/nnue/training/elo-${Date.now()}.json`),
);
const stockfish = new UciEngine(stockfishPath);
let points = 0;
let wins = 0;
let draws = 0;
let losses = 0;

await mkdir(dirname(outputPath), { recursive: true });
await stockfish.initialize();
await stockfish.setOption("Threads", getArg("--stockfish-threads", "1"));
await stockfish.setOption("Hash", getArg("--stockfish-hash", "128"));
await stockfish.setOption("UCI_LimitStrength", "true");
await stockfish.setOption("UCI_Elo", String(opponentElo));

try {
  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    const engine = new ChessEngine();
    const candidateColor = gameIndex % 2 === 0 ? COLOR.WHITE : COLOR.BLACK;
    const openingIndex = Math.trunc(gameIndex / 2) % MATCH_OPENING_LINES.length;
    const moves: string[] = [...MATCH_OPENING_LINES[openingIndex]];

    for (const move of moves) {
      engine.makeUciMove(move);
    }

    for (let ply = moves.length; ply < maxPly && !engine.isGameOver(); ply++) {
      const isCandidateTurn = engine.turn() === candidateColor;
      const move = isCandidateTurn
        ? chooseSearchMove(engine.exportFen(), ourDepth, ourMoveTimeMs, evaluator)
        : await stockfish.getBestMove(engine.exportFen(), stockfishMoveTimeMs);

      if (move === null || move === "0000") {
        break;
      }

      engine.makeUciMove(move);
      moves.push(move);
    }

    const result = getGameResult(engine);
    const gameScore = scoreForCandidate(result, candidateColor);

    points += gameScore;

    if (gameScore === 1) {
      wins++;
    } else if (gameScore === 0) {
      losses++;
    } else {
      draws++;
    }

    console.log(
      JSON.stringify({
        game: gameIndex + 1,
        result,
        engineResult: getCandidateResult(result, candidateColor),
        candidateColor: candidateColor === COLOR.WHITE ? "white" : "black",
        openingIndex,
        plies: moves.length,
      }),
    );
  }
} finally {
  stockfish.close();
}

const scoreRate = points / games;
const estimatedElo = estimateElo(scoreRate, opponentElo);
const report = {
  model: getModelLabel(modelPath),
  games,
  wins,
  draws,
  losses,
  scoreRate,
  opponentElo,
  estimatedElo,
};

await writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));

if (hasArg("--write-model")) {
  model.metadata = {
    ...model.metadata,
    createdAt: new Date().toISOString(),
    estimatedElo,
    trainingGames: model.metadata.trainingGames + games,
  };

  const checkpointPath = await writeNnueCheckpoint(
    model,
    getArg("--output-dir", "models/nnue/checkpoints"),
  );

  console.log(`Wrote ${checkpointPath}`);
}
