import generateFenFromPosition from "./fen/fenFromPosition/generateFenFromPosition";
import generateFenToPosition from "./fen/fenToPosition/generateFenToPosition";
import makeMove from "./position/moves/makeMove/makeMove";
import generateLegalMoves from "./movegen/generateLegalMoves";
import perft from "./perft/main";
import type { History } from "./types/history";
import { Position } from "./types/position";
import { createInitialPosition } from "./position/initialPosition";
import analyzePosition from "./position/analyzePosition/analyzePosition";
import { AnalyzePosition } from "./types/analyzePosition";
import undoMove from "./position/moves/undoMove/undoMove";

class ChessEngine {
  position: Position;
  history: History[];

  constructor(fen?: string) {
    this.position = fen
      ? generateFenToPosition(fen)
      : createInitialPosition();
    this.history = [];
  }

  public generateLegalMoves(): Uint32Array {
    return generateLegalMoves(this.position);
  }

  public makeMove(encodedMove: number): void {
    const undo = makeMove(this.position, encodedMove);

    this.history.push({ move: encodedMove, undo });
  }

  public undoMove(): void {
    const historyEntry = this.history.pop();

    if (!historyEntry) {
      return;
    }

    undoMove(this.position, historyEntry.move, historyEntry.undo);
  }

  public perft(depth: number): number {
    return perft(this.position, depth);
  }

  public loadFen(fen: string): void {
    this.position = generateFenToPosition(fen);
    this.history = [];
  }

  public exportFen(): string {
    return generateFenFromPosition(this.position);
  }

  public analyzePosition(): AnalyzePosition {
    return analyzePosition(this.position);
  }
}

export default ChessEngine;
