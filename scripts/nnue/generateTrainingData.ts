import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import generateLegalMoves from "../../src/engine/movegen/generateLegalMoves";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import packedMoveToUci from "../../src/engine/notation/uci/packedMoveToUci";
import { createSeededRandom, getRandomInt } from "../../src/search/nnue/random";
import { UciClient, type UciScore } from "../../src/uci/UciClient";
import { getArg, getNumberArg } from "./args";

const MATE_SCORE_CP = 30_000;

const scoreToCentipawns = (score: UciScore): number => {
  if (score.type === "cp") {
    return score.value;
  }

  return Math.sign(score.value) * (MATE_SCORE_CP - Math.abs(score.value));
};

const createRandomFen = (
  random: () => number,
  maxRandomPlies: number,
): string => {
  const engine = new ChessEngine();
  const plies = getRandomInt(random, 0, maxRandomPlies);

  for (let ply = 0; ply < plies && !engine.isGameOver(); ply++) {
    const position = generateFenToPosition(engine.exportFen());
    const moves = generateLegalMoves(position);

    if (moves.length === 0) {
      break;
    }

    engine.makeUciMove(
      packedMoveToUci(moves[getRandomInt(random, 0, moves.length - 1)]),
    );
  }

  return engine.exportFen();
};

const stockfishPath = resolve(
  getArg("--stockfish", "engines/stockfish/src/stockfish"),
);
const samples = getNumberArg("--samples", 128);
const depth = getNumberArg("--depth", 8);
const maxRandomPlies = getNumberArg("--max-random-plies", 80);
const seed = getNumberArg("--seed", 0x51a7e);
const outputPath = resolve(
  getArg("--output", `models/nnue/training/positions-${Date.now()}.jsonl`),
);
const stockfish = new UciClient(stockfishPath);
const random = createSeededRandom(seed);

await mkdir(dirname(outputPath), { recursive: true });
await stockfish.initialize();
await stockfish.setOption("Threads", getArg("--stockfish-threads", "1"));
await stockfish.setOption("Hash", getArg("--stockfish-hash", "128"));

try {
  let written = 0;

  while (written < samples) {
    const fen = createRandomFen(random, maxRandomPlies);
    const analysis = await stockfish.analyze(fen, { depth });

    if (analysis.score === null) {
      continue;
    }

    const record = {
      generatedAt: new Date().toISOString(),
      fen,
      scoreCp: scoreToCentipawns(analysis.score),
      bestMove: analysis.bestMove,
      stockfishDepth: depth,
    };

    await appendFile(outputPath, `${JSON.stringify(record)}\n`);
    written++;

    if (written % 16 === 0 || written === samples) {
      console.log(`${written}/${samples}`);
    }
  }
} finally {
  stockfish.close();
}

console.log(`Wrote ${outputPath}`);
