import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { MATCH_OPENING_LINES } from "./matchOpenings";

type CurvePoint = {
  depth: number;
  selDepth: number;
  score: string;
  nodes: number;
  timeMs: number;
};

type PendingLine = {
  predicate: (line: string) => boolean;
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);

  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

class CurveClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending: PendingLine[] = [];
  private curve: CurvePoint[] = [];

  public constructor(command: string) {
    this.child = spawn(command, [], { stdio: "pipe" });
    const lines = createInterface({ input: this.child.stdout });

    lines.on("line", (line) => this.handleLine(line.trim()));
    this.child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
    this.child.once("error", (error) => this.rejectAll(error));
  }

  public async initialize(hashMb: number): Promise<void> {
    await this.sendAndWait("uci", (line) => line === "uciok");
    this.send(`setoption name Threads value 1`);
    this.send(`setoption name Hash value ${hashMb}`);
    await this.sendAndWait("isready", (line) => line === "readyok");
  }

  public async search(
    moves: readonly string[],
    depth: number,
  ): Promise<CurvePoint[]> {
    this.send("ucinewgame");
    await this.sendAndWait("isready", (line) => line === "readyok");
    this.curve = [];
    this.send(
      moves.length === 0
        ? "position startpos"
        : `position startpos moves ${moves.join(" ")}`,
    );
    await this.sendAndWait(`go depth ${depth}`, (line) =>
      line.startsWith("bestmove "),
    );

    return [...this.curve];
  }

  public close(): void {
    this.send("quit");
    this.child.kill();
  }

  private send(command: string): void {
    this.child.stdin.write(`${command}\n`);
  }

  private sendAndWait(
    command: string,
    predicate: (line: string) => boolean,
  ): Promise<void> {
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        rejectPromise(new Error(`Timed out after command: ${command}`));
      }, 120_000);

      this.pending.push({
        predicate,
        resolve: resolvePromise,
        reject: rejectPromise,
        timeout,
      });
    });

    this.send(command);

    return promise;
  }

  private handleLine(line: string): void {
    if (line.startsWith("info ")) {
      const depth = /(?:^|\s)depth\s+(\d+)/.exec(line);
      const selDepth = /(?:^|\s)seldepth\s+(\d+)/.exec(line);
      const score = /(?:^|\s)score\s+(cp|mate)\s+(-?\d+)/.exec(line);
      const nodes = /(?:^|\s)nodes\s+(\d+)/.exec(line);
      const time = /(?:^|\s)time\s+(\d+)/.exec(line);

      if (depth !== null && nodes !== null && score !== null) {
        const point: CurvePoint = {
          depth: Number(depth[1]),
          selDepth: Number(selDepth?.[1] ?? depth[1]),
          score: `${score[1]} ${score[2]}`,
          nodes: Number(nodes[1]),
          timeMs: Number(time?.[1] ?? 0),
        };
        const existingIndex = this.curve.findIndex(
          (candidate) => candidate.depth === point.depth,
        );

        if (existingIndex === -1) {
          this.curve.push(point);
        } else {
          this.curve[existingIndex] = point;
        }
      }
    }

    const pendingIndex = this.pending.findIndex(({ predicate }) =>
      predicate(line),
    );

    if (pendingIndex !== -1) {
      const pending = this.pending.splice(pendingIndex, 1)[0];
      clearTimeout(pending.timeout);
      pending.resolve();
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.splice(0)) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
  }
}

const ourEnginePath = resolve(
  getArg("--our-engine", "dist/drumevp-chess-engine.js"),
);
const stockfishPath = resolve(
  getArg("--stockfish", "engines/stockfish/src/stockfish"),
);
const depth = Number(getArg("--depth", "8"));
const openingCount = Math.min(
  MATCH_OPENING_LINES.length,
  Number(getArg("--openings", "10")),
);
const hashMb = Number(getArg("--hash", "128"));
const ourEngine = new CurveClient(ourEnginePath);
const stockfish = new CurveClient(stockfishPath);

await Promise.all([
  ourEngine.initialize(hashMb),
  stockfish.initialize(hashMb),
]);

try {
  for (let index = 0; index < openingCount; index++) {
    const moves = MATCH_OPENING_LINES[index];
    const [ourCurve, stockfishCurve] = await Promise.all([
      ourEngine.search(moves, depth),
      stockfish.search(moves, depth),
    ]);

    console.log(
      JSON.stringify({
        position: index + 1,
        moves,
        ours: ourCurve,
        stockfish: stockfishCurve,
      }),
    );
  }
} finally {
  ourEngine.close();
  stockfish.close();
}
