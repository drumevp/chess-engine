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

class ChessEngine {
  private position: Position;
  private history: History[];
  private legalMovesCache: Uint32Array | null;

  constructor(fen?: string) {
    this.position = fen
      ? generateFenToPosition(fen)
      : createInitialPosition();
    this.history = [];
    this.legalMovesCache = null;
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
    const appliedMove = makeMoveWrapper(this.position, legalMoves, from, to, promotionPiece);

    this.history.push({ move: appliedMove.move, undo: appliedMove.undo });
    this.legalMovesCache = null;
  }

  public undoMove(): void {
    const historyEntry = this.history.pop();

    if (!historyEntry) {
      return;
    }

    undoMove(this.position, historyEntry.move, historyEntry.undo);
    this.legalMovesCache = null;
  }

  public perft(depth: number): number {
    return perft(this.position, depth);
  }

  public loadFen(fen: string): void {
    this.position = generateFenToPosition(fen);
    this.history = [];
    this.legalMovesCache = null;
  }

  public exportFen(): string {
    return generateFenFromPosition(this.position);
  }

  public analyzePosition(): AnalyzePosition {
    const positionAlanysis = analyzePosition(this.position);
    this.legalMovesCache = positionAlanysis.encodedLegalMoves;

    return positionAlanysis;
  }

  public getBoard(): Int8Array {
    return this.position.pieceAt;
  }
}

export default ChessEngine;
