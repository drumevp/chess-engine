import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import { COLOR } from "../../src/engine/constants/color";
import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import { createNnueEvaluator } from "../../src/search/nnue/inference";
import { getArg } from "./args";
import { chooseSearchMove } from "./searchMoves";
import { UciEngine } from "./uciEngine";

const getGameResult = (engine: ChessEngine): string => {
  if (engine.isCheckmate()) {
    return engine.turn() === COLOR.WHITE ? "0-1" : "1-0";
  }

  if (engine.isDraw() || engine.isStalemate()) {
    return "1/2-1/2";
  }

  return "*";
};

const stockfishPath = resolve(
  getArg("--stockfish", "engines/stockfish/src/stockfish"),
);
const games = Number(getArg("--games", "1"));
const maxPly = Number(getArg("--max-ply", "160"));
const ourDepth = Number(getArg("--our-depth", "2"));
const ourMoveTimeMs = Number(getArg("--our-movetime", "250"));
const stockfishMoveTimeMs = Number(getArg("--stockfish-movetime", "250"));
const evaluatorName = getArg("--eval", "nnue");
const outputPath = resolve(
  getArg("--output", `models/nnue/training/games-${Date.now()}.jsonl`),
);
const evaluator =
  evaluatorName === "nnue"
    ? createNnueEvaluator(createDefaultNnueModel())
    : undefined;
const stockfish = new UciEngine(stockfishPath);

await mkdir(dirname(outputPath), { recursive: true });
await stockfish.initialize();
await stockfish.setOption("Threads", getArg("--stockfish-threads", "1"));
await stockfish.setOption("Hash", getArg("--stockfish-hash", "128"));

try {
  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    const engine = new ChessEngine();
    const ourColor = gameIndex % 2 === 0 ? COLOR.WHITE : COLOR.BLACK;
    const moves: string[] = [];

    for (let ply = 0; ply < maxPly && !engine.isGameOver(); ply++) {
      const isOurTurn = engine.turn() === ourColor;
      const move = isOurTurn
        ? chooseSearchMove(engine.exportFen(), ourDepth, ourMoveTimeMs, evaluator)
        : await stockfish.getBestMove(engine.exportFen(), stockfishMoveTimeMs);

      if (move === null || move === "0000") {
        break;
      }

      engine.makeUciMove(move);
      moves.push(move);
    }

    const record = {
      playedAt: new Date().toISOString(),
      gameIndex,
      ourColor: ourColor === COLOR.WHITE ? "white" : "black",
      evaluator: evaluatorName,
      result: getGameResult(engine),
      finalFen: engine.exportFen(),
      moves,
    };

    await appendFile(outputPath, `${JSON.stringify(record)}\n`);
    console.log(`${gameIndex + 1}/${games}: ${record.result}`);
  }
} finally {
  stockfish.close();
}
