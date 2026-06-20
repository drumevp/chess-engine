import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import ChessEngine from "../engine/ChessEngine";
import { COLOR } from "../engine/constants/color";
import packedMoveToUci from "../engine/notation/uci/packedMoveToUci";
import { CHECKMATE_SCORE } from "../search/constants/eval";
import { MAX_LAZY_SMP_WORKER_COUNT } from "../search/constants/lazySmp";
import { serializeRepetitionCounts } from "../search/helpers/lazySmp";
import type { IterativeDeepeningSearchResult } from "../search/types/search";
import type {
  UciEvaluatorName,
  UciSearchRequest,
  UciSearchWorkerCommand,
  UciSearchWorkerMessage,
} from "./searchProtocol";

const DEFAULT_HASH_MB = 128;
const DEFAULT_MAX_DEPTH = 64;
const MAX_HASH_MB = 2_048;
const TRANSPOSITION_TABLE_BYTES_PER_ENTRY = 21;
const UCI_MATE_SCORE_THRESHOLD = CHECKMATE_SCORE - 1_000;

export type UciEngineOptions = {
  writeLine: (line: string) => void;
  name?: string;
  author?: string;
};

type ActiveSearch = {
  id: number;
  stopSignal: Int32Array<SharedArrayBuffer>;
  fallbackMove: string;
  lastBestMove: string | null;
  lastDepth: number;
};

const clampInteger = (
  value: number,
  min: number,
  max: number,
): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const getUciSearchWorkerUrl = (): URL =>
  new URL(
    import.meta.url.endsWith(".ts")
      ? "./uciSearchWorker.ts"
      : "./uciSearchWorker.js",
    import.meta.url,
  );

const hashMegabytesToTableSize = (hashMb: number): number => {
  const targetEntries = Math.max(
    1,
    Math.floor(
      (hashMb * 1024 * 1024) / TRANSPOSITION_TABLE_BYTES_PER_ENTRY,
    ),
  );

  return 2 ** Math.floor(Math.log2(targetEntries));
};

const getCommandNumber = (
  tokens: readonly string[],
  name: string,
): number | undefined => {
  const index = tokens.findIndex((token) => token.toLowerCase() === name);

  if (index === -1 || index + 1 >= tokens.length) {
    return undefined;
  }

  const value = Number(tokens[index + 1]);

  return Number.isFinite(value) ? value : undefined;
};

const sanitizeInfoString = (message: string): string =>
  message.replace(/[\r\n]+/g, " ").trim();

export class UciEngine {
  private readonly writeLine: (line: string) => void;
  private readonly name: string;
  private readonly author: string;
  private readonly searchWorker: Worker;
  private game = new ChessEngine();
  private threads = 1;
  private hashMb = DEFAULT_HASH_MB;
  private evaluator: UciEvaluatorName = "nnue";
  private nnueModelPath: string | undefined;
  private activeSearch: ActiveSearch | null = null;
  private nextSearchId = 1;
  private closed = false;

  constructor(options: UciEngineOptions) {
    this.writeLine = options.writeLine;
    this.name = options.name ?? "Drumevp Chess Engine";
    this.author = options.author ?? "drumevp";
    this.searchWorker = new Worker(getUciSearchWorkerUrl());
    this.searchWorker.on("message", (message: UciSearchWorkerMessage) => {
      this.handleSearchWorkerMessage(message);
    });
    this.searchWorker.on("error", (error) => {
      this.writeInfo(
        `search worker error: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.finishSearchWithFallback();
    });
  }

  public async handleCommand(command: string): Promise<boolean> {
    const tokens = command.trim().split(/\s+/);
    const commandName = tokens[0]?.toLowerCase();

    if (commandName === undefined || commandName === "") {
      return true;
    }

    switch (commandName) {
      case "uci":
        this.writeIdentification();
        break;
      case "isready":
        this.writeLine("readyok");
        break;
      case "setoption":
        this.handleSetOption(tokens);
        break;
      case "ucinewgame":
        this.stopSearch(false);
        this.game = new ChessEngine();
        this.clearHash();
        break;
      case "position":
        this.handlePosition(tokens);
        break;
      case "go":
        this.startSearch(tokens);
        break;
      case "stop":
        this.stopSearch(true);
        break;
      case "quit":
        await this.close();
        return false;
      case "debug":
      case "ponderhit":
      case "register":
        break;
      default:
        this.writeInfo(`unknown command: ${commandName}`);
    }

    return true;
  }

  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.stopSearch(false);
    await this.searchWorker.terminate();
  }

  private writeIdentification(): void {
    this.writeLine(`id name ${this.name}`);
    this.writeLine(`id author ${this.author}`);
    this.writeLine(
      `option name Threads type spin default 1 min 1 max ${MAX_LAZY_SMP_WORKER_COUNT}`,
    );
    this.writeLine(
      `option name Hash type spin default ${DEFAULT_HASH_MB} min 1 max ${MAX_HASH_MB}`,
    );
    this.writeLine(
      "option name Evaluator type combo default nnue var nnue var simple",
    );
    this.writeLine("option name EvalFile type string default default");
    this.writeLine("option name Clear Hash type button");
    this.writeLine("uciok");
  }

  private handleSetOption(tokens: readonly string[]): void {
    const nameIndex = tokens.findIndex(
      (token) => token.toLowerCase() === "name",
    );
    const valueIndex = tokens.findIndex(
      (token, index) =>
        index > nameIndex && token.toLowerCase() === "value",
    );

    if (nameIndex === -1) {
      this.writeInfo("setoption is missing a name");
      return;
    }

    const name = tokens
      .slice(nameIndex + 1, valueIndex === -1 ? tokens.length : valueIndex)
      .join(" ")
      .toLowerCase();
    const value =
      valueIndex === -1 ? "" : tokens.slice(valueIndex + 1).join(" ").trim();

    switch (name) {
      case "threads":
        this.threads = clampInteger(
          Number(value),
          1,
          MAX_LAZY_SMP_WORKER_COUNT,
        );
        break;
      case "hash":
        this.hashMb = clampInteger(Number(value), 1, MAX_HASH_MB);
        this.clearHash();
        break;
      case "evaluator":
        if (value === "simple" || value === "nnue") {
          this.evaluator = value;
          this.clearHash();
        } else {
          this.writeInfo('Evaluator must be either "nnue" or "simple"');
        }
        break;
      case "evalfile":
        this.nnueModelPath =
          value === "" || value === "default" ? undefined : resolve(value);
        this.clearHash();
        break;
      case "clear hash":
        this.clearHash();
        break;
      default:
        this.writeInfo(`unknown option: ${name}`);
    }
  }

  private handlePosition(tokens: readonly string[]): void {
    this.stopSearch(false);
    const movesIndex = tokens.findIndex(
      (token, index) => index >= 2 && token.toLowerCase() === "moves",
    );
    const positionEnd = movesIndex === -1 ? tokens.length : movesIndex;

    try {
      let nextGame: ChessEngine;

      if (tokens[1]?.toLowerCase() === "startpos") {
        nextGame = new ChessEngine();
      } else if (tokens[1]?.toLowerCase() === "fen") {
        nextGame = new ChessEngine(tokens.slice(2, positionEnd).join(" "));
      } else {
        throw new Error('position must contain "startpos" or "fen"');
      }

      if (movesIndex !== -1) {
        for (const move of tokens.slice(movesIndex + 1)) {
          nextGame.makeUciMove(move);
        }
      }

      this.game = nextGame;
    } catch (error) {
      this.writeInfo(
        `invalid position: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private startSearch(tokens: readonly string[]): void {
    this.stopSearch(false);
    const legalMoves = this.game.generateLegalMoves();
    const fallbackMove =
      legalMoves.length === 0 ? "0000" : packedMoveToUci(legalMoves[0]);
    const stopSignal = new Int32Array(new SharedArrayBuffer(4));
    const maxDepth = clampInteger(
      getCommandNumber(tokens, "depth") ?? DEFAULT_MAX_DEPTH,
      1,
      DEFAULT_MAX_DEPTH,
    );
    const maxNodes = getCommandNumber(tokens, "nodes");
    const maxTimeMs = this.getSearchTimeMs(tokens);
    const searchId = this.nextSearchId++;
    const request: UciSearchRequest = {
      searchId,
      fen: this.game.exportFen(),
      repetitionCounts: serializeRepetitionCounts(
        this.game.getRepetitionCounts(),
      ),
      maxDepth,
      limits: {
        maxNodes:
          maxNodes === undefined ? undefined : Math.max(1, Math.trunc(maxNodes)),
        maxTimeMs,
        stopSignal,
      },
      threads: this.threads,
      evaluator: this.evaluator,
      nnueModelPath: this.nnueModelPath,
      transpositionTableSize: hashMegabytesToTableSize(this.hashMb),
    };

    this.activeSearch = {
      id: searchId,
      stopSignal,
      fallbackMove,
      lastBestMove: null,
      lastDepth: -1,
    };
    this.postToSearchWorker({ type: "search", request });
  }

  private getSearchTimeMs(tokens: readonly string[]): number | undefined {
    const moveTimeMs = getCommandNumber(tokens, "movetime");

    if (moveTimeMs !== undefined) {
      return Math.max(1, Math.trunc(moveTimeMs));
    }

    if (tokens.some((token) => token.toLowerCase() === "infinite")) {
      return undefined;
    }

    const isWhite = this.game.turn() === COLOR.WHITE;
    const remainingTimeMs = getCommandNumber(tokens, isWhite ? "wtime" : "btime");

    if (remainingTimeMs === undefined) {
      return undefined;
    }

    const incrementMs =
      getCommandNumber(tokens, isWhite ? "winc" : "binc") ?? 0;
    const movesToGo = clampInteger(
      getCommandNumber(tokens, "movestogo") ?? 30,
      1,
      100,
    );
    const reserveMs = Math.min(100, remainingTimeMs * 0.05);
    const availableMs = Math.max(1, remainingTimeMs - reserveMs);
    const budgetMs = availableMs / movesToGo + incrementMs * 0.8;

    return Math.max(1, Math.trunc(Math.min(availableMs, budgetMs)));
  }

  private handleSearchWorkerMessage(message: UciSearchWorkerMessage): void {
    const activeSearch = this.activeSearch;

    if (activeSearch === null || message.searchId !== activeSearch.id) {
      return;
    }

    if (message.type === "error") {
      this.writeInfo(`search error: ${message.message}`);
      this.finishSearchWithFallback();
      return;
    }

    this.recordSearchResult(message.result);

    if (message.type === "result") {
      this.finishSearch(message.result);
    }
  }

  private recordSearchResult(result: IterativeDeepeningSearchResult): void {
    const activeSearch = this.activeSearch;

    if (activeSearch === null) {
      return;
    }

    if (result.bestMove !== null) {
      activeSearch.lastBestMove = packedMoveToUci(result.bestMove);
    }

    if (result.depth === activeSearch.lastDepth) {
      return;
    }

    activeSearch.lastDepth = result.depth;
    const timeMs = Math.max(0, Math.trunc(result.elapsedTimeMs));
    const nps =
      timeMs === 0
        ? result.nodes
        : Math.trunc((result.nodes * 1_000) / timeMs);
    const pv = result.pv.map(packedMoveToUci).join(" ");
    const pvSuffix = pv === "" ? "" : ` pv ${pv}`;

    this.writeLine(
      `info depth ${result.depth} ${this.formatScore(result.score)} nodes ${result.nodes} time ${timeMs} nps ${nps}${pvSuffix}`,
    );
  }

  private formatScore(score: number): string {
    if (Math.abs(score) >= UCI_MATE_SCORE_THRESHOLD) {
      const pliesToMate = Math.max(0, CHECKMATE_SCORE - Math.abs(score));
      const movesToMate = Math.max(1, Math.ceil(pliesToMate / 2));

      return `score mate ${score < 0 ? -movesToMate : movesToMate}`;
    }

    return `score cp ${Number.isFinite(score) ? Math.trunc(score) : 0}`;
  }

  private finishSearch(result: IterativeDeepeningSearchResult): void {
    const activeSearch = this.activeSearch;

    if (activeSearch === null) {
      return;
    }

    const bestMove =
      result.bestMove === null
        ? activeSearch.lastBestMove ?? activeSearch.fallbackMove
        : packedMoveToUci(result.bestMove);

    this.activeSearch = null;
    this.writeLine(`bestmove ${bestMove}`);
  }

  private finishSearchWithFallback(): void {
    const activeSearch = this.activeSearch;

    if (activeSearch === null) {
      return;
    }

    this.activeSearch = null;
    this.writeLine(
      `bestmove ${activeSearch.lastBestMove ?? activeSearch.fallbackMove}`,
    );
  }

  private stopSearch(emitBestMove: boolean): void {
    const activeSearch = this.activeSearch;

    if (activeSearch === null) {
      return;
    }

    Atomics.store(activeSearch.stopSignal, 0, 1);
    this.activeSearch = null;

    if (emitBestMove) {
      this.writeLine(
        `bestmove ${activeSearch.lastBestMove ?? activeSearch.fallbackMove}`,
      );
    }
  }

  private clearHash(): void {
    this.postToSearchWorker({ type: "clearHash" });
  }

  private postToSearchWorker(command: UciSearchWorkerCommand): void {
    if (!this.closed) {
      this.searchWorker.postMessage(command);
    }
  }

  private writeInfo(message: string): void {
    this.writeLine(`info string ${sanitizeInfoString(message)}`);
  }
}
