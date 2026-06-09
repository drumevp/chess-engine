import analyzePosition from "./analyzePosition/main";
import { AnalyzePosition } from "./analyzePosition/types";
import generateFenFromPosition from "./fen/fenFromPosition/generateFenFromPosition";
import generatePositionFromFen from "./fen/fenToPosition/generatePositionToFen";
import makeMove from "./makeMove/makeMove";
import generateLegalMoves from "./moves/generateLegalMoves";
import perft from "./perft/main";
import { createInitialPosition } from "./state/initialState";
import type { History } from "./types/history";
import { type Position } from "./types/main";
import undoMove from "./undoMove/main";

class ChessEngine {
  position: Position;
  history: History[];

  constructor(fen?: string) {
    this.position = fen
      ? generatePositionFromFen(fen)
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
    this.position = generatePositionFromFen(fen);
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
