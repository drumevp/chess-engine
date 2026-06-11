import generateFenFromPosition from "./fen/fenFromPosition/generateFenFromPosition";
import generateFenToPosition from "./fen/fenToPosition/generateFenToPosition";
import generateLegalMoves from "./movegen/generateLegalMoves";
import perft from "./perft/main";
import type { History } from "./types/history";
import { Position } from "./types/position";
import { createInitialPosition } from "./position/initialPosition";
import analyzePosition from "./position/analyzePosition/analyzePosition";
import { AnalyzePosition } from "./types/analyzePosition";
import undoMove from "./position/moves/undoMove/undoMove";
import makeMoveWrapper from "./position/moves/makeMove/makeMoveWrapper";
import { GAME_END_REASON, GAME_STATE } from "./constants/gameState";
import { ColorType } from "./types/color";

class ChessEngine {
  private position: Position;
  private history: History[];
  private repetitionCounts: Map<bigint, number>;

  // Caches
  private legalMovesCache: Uint32Array | null;
  private analyzePositionCache: AnalyzePosition | null;

  constructor(fen?: string) {
    this.position = fen ? generateFenToPosition(fen) : createInitialPosition();
    this.history = [];

    this.repetitionCounts = new Map();
    // Set the count for the current position hash to 1
    this.repetitionCounts.set(this.position.zobristHash, 1);

    // Caches
    this.legalMovesCache = null;
    this.analyzePositionCache = null;
  }

  public generateLegalMoves(): Uint32Array {
    if (this.legalMovesCache !== null) {
      return this.legalMovesCache;
    }

    this.legalMovesCache = generateLegalMoves(this.position);

    return this.legalMovesCache;
  }

  public makeMove(from: number, to: number, promotionPiece?: number): void {
    const legalMoves = this.generateLegalMoves();
    const appliedMove = makeMoveWrapper(
      this.position,
      legalMoves,
      from,
      to,
      promotionPiece,
    );

    // History update
    this.history.push({ move: appliedMove.move, undo: appliedMove.undo });

    // Clear caches
    this.legalMovesCache = null;
    this.analyzePositionCache = null;

    // Update position repetition counts
    const currentHashCount =
      this.repetitionCounts.get(this.position.zobristHash) ?? 0;
    this.repetitionCounts.set(this.position.zobristHash, currentHashCount + 1);
  }

  public undoMove(): void {
    const historyEntry = this.history.pop();

    if (!historyEntry) {
      return;
    }

    // Undo repetition counts
    const hashToRemove = this.position.zobristHash;
    const previousHashCount = this.repetitionCounts.get(hashToRemove) ?? 0;

    if (previousHashCount <= 1) {
      this.repetitionCounts.delete(hashToRemove);
    } else {
      this.repetitionCounts.set(hashToRemove, previousHashCount - 1);
    }

    undoMove(this.position, historyEntry.move, historyEntry.undo);

    // Clear caches
    this.legalMovesCache = null;
    this.analyzePositionCache = null;
  }

  public perft(depth: number): number {
    return perft(this.position, depth);
  }

  public loadFen(fen: string): void {
    this.position = generateFenToPosition(fen);

    // Clear history
    this.history = [];

    // Clear caches
    this.legalMovesCache = null;
    this.analyzePositionCache = null;

    // Clear & set repetition counts
    this.repetitionCounts = new Map();
    this.repetitionCounts.set(this.position.zobristHash, 1);
  }

  public exportFen(): string {
    return generateFenFromPosition(this.position);
  }

  public analyzePosition(): AnalyzePosition {
    if (this.analyzePositionCache !== null) {
      return this.analyzePositionCache;
    }

    const positionAnalysis = analyzePosition(
      this.position,
      this.repetitionCounts,
    );

    this.legalMovesCache = positionAnalysis.encodedLegalMoves;
    this.analyzePositionCache = positionAnalysis;

    return positionAnalysis;
  }

  public board(): Int8Array {
    return this.position.pieceAt;
  }

  public turn(): ColorType {
    return this.position.color;
  }

  public isCheck(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.isCheck;
  }

  public isCheckmate(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.gameState === GAME_STATE.CHECKMATE;
  }

  public isStalemate(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.gameState === GAME_STATE.STALEMATE;
  }

  public isDraw(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.gameState === GAME_STATE.DRAW;
  }

  public isThreefoldRepetition(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.gameEndReason === GAME_END_REASON.REPETITION;
  }

  public isInsufficientMaterial(): boolean {
    const positionAnalysis = this.analyzePosition();

    return (
      positionAnalysis.gameEndReason === GAME_END_REASON.INSUFFICIENT_MATERIAL
    );
  }

  public isGameOver(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.gameState !== GAME_STATE.ONGOING;
  }

  public isHalfmoveClockDraw(): boolean {
    const positionAnalysis = this.analyzePosition();

    return positionAnalysis.gameEndReason === GAME_END_REASON.HALFMOVE_CLOCK;
  }
}

export default ChessEngine;
