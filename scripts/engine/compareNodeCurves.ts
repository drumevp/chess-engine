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
  bestMove: string | null;
};

type TestPosition = {
  name: string;
  command: string;
};

const TACTICAL_POSITIONS: readonly TestPosition[] = [
  {
    name: "kiwipete",
    command:
      "position fen r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
  },
  {
    name: "legal-trap",
    command:
      "position startpos moves e2e4 e7e5 g1f3 b8c6 f1c4 d7d6 b1c3 c8g4",
  },
  {
    name: "scholars-mate",
    command:
      "position fen r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
  },
  {
    name: "queen-mate",
    command: "position fen 7k/6pp/5KQ1/8/8/8/8/8 w - - 0 1",
  },
  {
    name: "tactical-middlegame",
    command:
      "position fen rnbq1k1r/pp1Pbppp/2p2n2/8/2B5/8/PPP1NPPP/RNBQK2R b KQ - 1 8",
  },
  {
    name: "promotion-race",
    command: "position fen 8/P7/8/8/8/8/7p/5K1k w - - 0 1",
  },
];

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
    positionCommand: string,
    goCommand: string,
  ): Promise<CurvePoint[]> {
    this.send("ucinewgame");
    await this.sendAndWait("isready", (line) => line === "readyok");
    this.curve = [];
    this.send(positionCommand);
    await this.sendAndWait(goCommand, (line) =>
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
      const bestMove = /(?:^|\s)pv\s+(\S+)/.exec(line);

      if (depth !== null && nodes !== null && score !== null) {
        const point: CurvePoint = {
          depth: Number(depth[1]),
          selDepth: Number(selDepth?.[1] ?? depth[1]),
          score: `${score[1]} ${score[2]}`,
          nodes: Number(nodes[1]),
          timeMs: Number(time?.[1] ?? 0),
          bestMove: bestMove?.[1] ?? null,
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
const nodeLimit = Number(getArg("--nodes", "0"));
const goCommand =
  nodeLimit > 0 ? `go nodes ${nodeLimit}` : `go depth ${depth}`;
const suite = getArg("--suite", "openings");
const openingPositions = MATCH_OPENING_LINES.map<TestPosition>(
  (moves, index) => ({
    name: `opening-${index + 1}`,
    command:
      moves.length === 0
        ? "position startpos"
        : `position startpos moves ${moves.join(" ")}`,
  }),
);
const allPositions =
  suite === "tactics"
    ? TACTICAL_POSITIONS
    : suite === "all"
      ? [...openingPositions, ...TACTICAL_POSITIONS]
      : openingPositions;
const positionCount = Math.min(
  allPositions.length,
  Number(getArg("--positions", getArg("--openings", "10"))),
);
const hashMb = Number(getArg("--hash", "128"));
const ourEngine = new CurveClient(ourEnginePath);
const stockfish = new CurveClient(stockfishPath);

await Promise.all([
  ourEngine.initialize(hashMb),
  stockfish.initialize(hashMb),
]);

try {
  for (let index = 0; index < positionCount; index++) {
    const testPosition = allPositions[index];
    const [ourCurve, stockfishCurve] = await Promise.all([
      ourEngine.search(testPosition.command, goCommand),
      stockfish.search(testPosition.command, goCommand),
    ]);

    console.log(
      JSON.stringify({
        position: index + 1,
        name: testPosition.name,
        command: testPosition.command,
        ours: ourCurve,
        stockfish: stockfishCurve,
      }),
    );
  }
} finally {
  ourEngine.close();
  stockfish.close();
}
