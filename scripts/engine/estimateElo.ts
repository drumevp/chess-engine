import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import { COLOR } from "../../src/engine/constants/color";
import { UciClient } from "../../src/uci/UciClient";
import type { UciEvaluatorName } from "../../src/uci/searchProtocol";
import { getArg, getNumberArg } from "../nnue/args";
import { MATCH_OPENING_LINES } from "./matchOpenings";
import { getModelLabel } from "../nnue/modelFiles";

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

const getPositiveIntegerArg = (name: string, fallback: number): number => {
  const value = getNumberArg(name, fallback);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};

const parseEvaluatorName = (): UciEvaluatorName => {
  const evaluatorName = getArg("--evaluator", "nnue");

  if (evaluatorName !== "simple" && evaluatorName !== "nnue") {
    throw new Error('--evaluator must be either "simple" or "nnue"');
  }

  return evaluatorName;
};

const evaluatorName = parseEvaluatorName();
const modelPath = getArg("--model", "default");
const ourThreads = getPositiveIntegerArg("--our-threads", 1);
const enemyThreads = getPositiveIntegerArg("--enemy-threads", 1);
const ourEnginePath = resolve(
  getArg("--our-engine", "dist/drumevp-chess-engine.js"),
);
const stockfishPath = resolve(
  getArg("--stockfish", "engines/stockfish/src/stockfish"),
);
const games = getPositiveIntegerArg("--games", 4);

if (games % 2 !== 0) {
  throw new Error(
    "--games must be even so every opening is played as both colors",
  );
}

const maxPly = getPositiveIntegerArg("--max-ply", 160);
const ourDepth = getPositiveIntegerArg("--our-depth", 4);
const ourMoveTimeMs = getPositiveIntegerArg("--our-movetime", 50);
const enemyMoveTimeMs = getPositiveIntegerArg("--enemy-movetime", 50);
const ourHashMb = getPositiveIntegerArg("--our-hash", 128);
const enemyHashMb = getPositiveIntegerArg("--enemy-hash", 128);
const opponentElo = Math.max(1320, getNumberArg("--opponent-elo", 1320));
const outputPath = resolve(
  getArg("--output", `reports/engine/elo-${Date.now()}.json`),
);

try {
  await access(ourEnginePath);
} catch {
  throw new Error(
    `Our UCI engine was not found at ${ourEnginePath}; run npm run build first`,
  );
}

const candidate = new UciClient(process.execPath, {
  args: [ourEnginePath],
});
const stockfish = new UciClient(stockfishPath);
let points = 0;
let wins = 0;
let draws = 0;
let losses = 0;

await mkdir(dirname(outputPath), { recursive: true });

try {
  await candidate.initialize();
  await candidate.setOption("Threads", ourThreads);
  await candidate.setOption("Hash", ourHashMb);
  await candidate.setOption("Evaluator", evaluatorName);

  if (evaluatorName === "nnue") {
    await candidate.setOption(
      "EvalFile",
      modelPath === "default" ? "default" : resolve(modelPath),
    );
  }

  await stockfish.initialize();
  await stockfish.setOption("Threads", enemyThreads);
  await stockfish.setOption("Hash", enemyHashMb);
  await stockfish.setOption("UCI_LimitStrength", true);
  await stockfish.setOption("UCI_Elo", opponentElo);

  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    await candidate.newGame();
    await stockfish.newGame();

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
        ? await candidate.getBestMoveFromPosition(
            { startPosition: true, moves },
            { depth: ourDepth, moveTimeMs: ourMoveTimeMs },
          )
        : await stockfish.getBestMoveFromPosition(
            { startPosition: true, moves },
            { moveTimeMs: enemyMoveTimeMs },
          );

      if (move === "0000") {
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
  candidate.close();
  stockfish.close();
}

const scoreRate = points / games;
const estimatedElo = estimateElo(scoreRate, opponentElo);
const report = {
  evaluator: evaluatorName,
  model: evaluatorName === "nnue" ? getModelLabel(modelPath) : null,
  games,
  wins,
  draws,
  losses,
  scoreRate,
  opponentElo,
  estimatedElo,
  ourThreads,
  enemyThreads,
  ourDepth,
  ourMoveTimeMs,
  enemyMoveTimeMs,
  ourHashMb,
  enemyHashMb,
  ourEnginePath,
  stockfishPath,
};

await writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
