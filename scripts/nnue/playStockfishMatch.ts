import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import { COLOR } from "../../src/engine/constants/color";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import internalToUci from "../../src/engine/notation/uci/internalToUci";
import {
  moveDecodeFrom,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../../src/engine/position/moves/packedMove";
import iterativeDeepeningSearch from "../../src/search/iterativeDeepeningSearch";
import type { SearchEvaluator } from "../../src/search/types/nnue";
import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import { createNnueEvaluator } from "../../src/search/nnue/inference";

type PendingLine = {
  predicate: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

class UciEngine {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingLines: PendingLine[] = [];
  private bufferedOutput = "";

  constructor(binaryPath: string) {
    this.child = spawn(binaryPath, [], {
      stdio: "pipe",
    });
    this.child.stdout.on("data", (chunk: Buffer) => {
      this.handleOutput(chunk.toString("utf8"));
    });
    this.child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
  }

  public send(command: string): void {
    this.child.stdin.write(`${command}\n`);
  }

  public async initialize(): Promise<void> {
    this.send("uci");
    await this.waitForLine((line) => line === "uciok");
    this.send("isready");
    await this.waitForLine((line) => line === "readyok");
  }

  public async setOption(name: string, value: string): Promise<void> {
    this.send(`setoption name ${name} value ${value}`);
    this.send("isready");
    await this.waitForLine((line) => line === "readyok");
  }

  public async getBestMove(fen: string, moveTimeMs: number): Promise<string> {
    this.send(`position fen ${fen}`);
    this.send(`go movetime ${moveTimeMs}`);
    const bestMoveLine = await this.waitForLine((line) =>
      line.startsWith("bestmove "),
    );

    return bestMoveLine.split(/\s+/)[1] ?? "0000";
  }

  public close(): void {
    this.send("quit");
    this.child.kill();
  }

  private handleOutput(output: string): void {
    this.bufferedOutput += output;
    const lines = this.bufferedOutput.split(/\r?\n/);
    this.bufferedOutput = lines.pop() ?? "";

    for (const line of lines) {
      this.resolvePendingLine(line.trim());
    }
  }

  private resolvePendingLine(line: string): void {
    for (let i = 0; i < this.pendingLines.length; i++) {
      const pendingLine = this.pendingLines[i];

      if (!pendingLine.predicate(line)) {
        continue;
      }

      clearTimeout(pendingLine.timeout);
      this.pendingLines.splice(i, 1);
      pendingLine.resolve(line);

      return;
    }
  }

  private waitForLine(
    predicate: (line: string) => boolean,
    timeoutMs = 30_000,
  ): Promise<string> {
    return new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        const index = this.pendingLines.findIndex(
          (pendingLine) => pendingLine.predicate === predicate,
        );

        if (index !== -1) {
          this.pendingLines.splice(index, 1);
        }

        rejectPromise(new Error("Timed out waiting for UCI output"));
      }, timeoutMs);

      this.pendingLines.push({
        predicate,
        resolve: resolvePromise,
        reject: rejectPromise,
        timeout,
      });
    });
  }
}

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);

  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }

  return process.argv[index + 1];
};

const encodedMoveToUci = (move: number): string =>
  internalToUci({
    from: moveDecodeFrom(move),
    to: moveDecodeTo(move),
    promotionPiece: moveDecodePromotionPiece(move),
  });

const chooseOurMove = (
  engine: ChessEngine,
  depth: number,
  moveTimeMs: number,
  evaluator?: SearchEvaluator,
): string | null => {
  const position = generateFenToPosition(engine.exportFen());
  const repetitionCounts = new Map<bigint, number>([
    [position.zobristHash, 1],
  ]);

  const result = iterativeDeepeningSearch(
    position,
    repetitionCounts,
    depth,
    { maxTimeMs: moveTimeMs },
    evaluator,
  );

  return result.bestMove === null ? null : encodedMoveToUci(result.bestMove);
};

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
        ? chooseOurMove(engine, ourDepth, ourMoveTimeMs, evaluator)
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
