import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export type UciScore = {
  type: "cp" | "mate";
  value: number;
};

export type UciAnalysis = {
  bestMove: string;
  score: UciScore | null;
};

type PendingLine = {
  predicate: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class UciEngine {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingLines: PendingLine[] = [];
  private bufferedOutput = "";
  private lastScore: UciScore | null = null;

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
    return (await this.analyze(fen, { moveTimeMs })).bestMove;
  }

  public async analyze(
    fen: string,
    options: { depth?: number; moveTimeMs?: number },
  ): Promise<UciAnalysis> {
    this.lastScore = null;
    this.send(`position fen ${fen}`);

    if (options.depth !== undefined) {
      this.send(`go depth ${options.depth}`);
    } else {
      this.send(`go movetime ${options.moveTimeMs ?? 250}`);
    }

    const bestMoveLine = await this.waitForLine((line) =>
      line.startsWith("bestmove "),
    );

    return {
      bestMove: bestMoveLine.split(/\s+/)[1] ?? "0000",
      score: this.lastScore,
    };
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
      const trimmedLine = line.trim();

      this.updateScore(trimmedLine);
      this.resolvePendingLine(trimmedLine);
    }
  }

  private updateScore(line: string): void {
    const match = /(?:^|\s)score\s+(cp|mate)\s+(-?\d+)/.exec(line);

    if (match === null) {
      return;
    }

    this.lastScore = {
      type: match[1] === "mate" ? "mate" : "cp",
      value: Number(match[2]),
    };
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
