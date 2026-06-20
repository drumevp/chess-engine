import {
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";

export const DEFAULT_UCI_MOVE_TIME_MS = 250;
export const DEFAULT_UCI_TIMEOUT_MS = 30_000;

export type UciScore = {
  type: "cp" | "mate";
  value: number;
};

export type UciAnalysis = {
  bestMove: string;
  score: UciScore | null;
};

export type UciPosition =
  | { fen: string; moves?: readonly string[] }
  | { startPosition: true; moves?: readonly string[] };

export type UciGoOptions = {
  depth?: number;
  moveTimeMs?: number;
  nodes?: number;
};

export type UciClientOptions = {
  args?: readonly string[];
  moveTimeMs?: number;
  timeoutMs?: number;
  forwardStderr?: boolean;
};

type PendingLine = {
  predicate: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

/** A small client for driving an external UCI-compatible chess engine. */
export class UciClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingLines: PendingLine[] = [];
  private readonly moveTimeMs: number;
  private readonly timeoutMs: number;
  private bufferedOutput = "";
  private lastScore: UciScore | null = null;
  private closed = false;
  private terminalError: Error | null = null;

  constructor(binaryPath: string, options: UciClientOptions = {}) {
    this.moveTimeMs = options.moveTimeMs ?? DEFAULT_UCI_MOVE_TIME_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_UCI_TIMEOUT_MS;
    this.child = spawn(binaryPath, [...(options.args ?? [])], {
      stdio: "pipe",
    });
    this.child.stdout.on("data", (chunk: Buffer) => {
      this.handleOutput(chunk.toString("utf8"));
    });

    if (options.forwardStderr ?? true) {
      this.child.stderr.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
      });
    }

    this.child.once("error", (error) => {
      this.fail(error);
    });
    this.child.once("exit", (code, signal) => {
      if (!this.closed) {
        this.fail(
          new Error(
            `UCI engine exited before quit (code ${String(code)}, signal ${String(signal)})`,
          ),
        );
      }
    });
  }

  public send(command: string): void {
    if (this.terminalError !== null) {
      throw this.terminalError;
    }

    if (this.closed || !this.child.stdin.writable) {
      throw new Error("Cannot send a command to a closed UCI engine");
    }

    this.child.stdin.write(`${command}\n`);
  }

  public async initialize(): Promise<void> {
    await this.sendAndWait("uci", (line) => line === "uciok");
    await this.waitUntilReady();
  }

  public async waitUntilReady(): Promise<void> {
    await this.sendAndWait("isready", (line) => line === "readyok");
  }

  public async newGame(): Promise<void> {
    this.send("ucinewgame");
    await this.waitUntilReady();
  }

  public async setOption(
    name: string,
    value?: string | number | boolean,
  ): Promise<void> {
    const valueSuffix =
      value === undefined || value === "" ? "" : ` value ${String(value)}`;

    this.send(`setoption name ${name}${valueSuffix}`);
    await this.waitUntilReady();
  }

  public async getBestMove(
    fen: string,
    moveTimeMs = this.moveTimeMs,
  ): Promise<string> {
    return (await this.analyze(fen, { moveTimeMs })).bestMove;
  }

  public async getBestMoveFromPosition(
    position: UciPosition,
    options: UciGoOptions = {},
  ): Promise<string> {
    return (await this.analyzePosition(position, options)).bestMove;
  }

  public async analyze(
    fen: string,
    options: UciGoOptions = {},
  ): Promise<UciAnalysis> {
    return this.analyzePosition({ fen }, options);
  }

  public async analyzePosition(
    position: UciPosition,
    options: UciGoOptions = {},
  ): Promise<UciAnalysis> {
    this.lastScore = null;
    const moves = position.moves ?? [];
    const positionCommand =
      "fen" in position
        ? `position fen ${position.fen}`
        : "position startpos";
    const movesSuffix = moves.length === 0 ? "" : ` moves ${moves.join(" ")}`;

    this.send(`${positionCommand}${movesSuffix}`);

    const goArguments: string[] = [];

    if (options.depth !== undefined) {
      goArguments.push("depth", String(options.depth));
    }

    if (options.moveTimeMs !== undefined) {
      goArguments.push("movetime", String(options.moveTimeMs));
    }

    if (options.nodes !== undefined) {
      goArguments.push("nodes", String(options.nodes));
    }

    if (goArguments.length === 0) {
      goArguments.push("movetime", String(this.moveTimeMs));
    }

    const bestMovePromise = this.waitForLine(
      (line) => line.startsWith("bestmove "),
      options.moveTimeMs === undefined
        ? this.timeoutMs
        : Math.max(this.timeoutMs, options.moveTimeMs + 5_000),
    );

    this.send(`go ${goArguments.join(" ")}`);

    const bestMoveLine = await bestMovePromise;

    return {
      bestMove: bestMoveLine.split(/\s+/)[1] ?? "0000",
      score: this.lastScore,
    };
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    if (this.terminalError === null && this.child.stdin.writable) {
      this.send("quit");
    }

    this.closed = true;
    this.child.kill();
    this.rejectPendingLines(new Error("UCI engine closed"));
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

  private rejectPendingLines(error: Error): void {
    while (this.pendingLines.length > 0) {
      const pendingLine = this.pendingLines.pop();

      if (pendingLine !== undefined) {
        clearTimeout(pendingLine.timeout);
        pendingLine.reject(error);
      }
    }
  }

  private fail(error: Error): void {
    this.terminalError = error;
    this.rejectPendingLines(error);
  }

  private sendAndWait(
    command: string,
    predicate: (line: string) => boolean,
  ): Promise<string> {
    const linePromise = this.waitForLine(predicate);

    this.send(command);

    return linePromise;
  }

  private waitForLine(
    predicate: (line: string) => boolean,
    timeoutMs = this.timeoutMs,
  ): Promise<string> {
    if (this.terminalError !== null) {
      return Promise.reject(this.terminalError);
    }

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
