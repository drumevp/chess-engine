import makeMove from "./makeMove/makeMove";
import generateLegalMoves from "./moves/generateLegalMoves";
import perft from "./perft/main";
import { createInitialPosition } from "./state/initialState";
import type { History } from "./types/history";
import { type Move, type Position } from "./types/main";
import undoMove from "./undoMove/main";

class ChessEngine {
  position: Position;
  history: History[];

  constructor() {
    this.position = createInitialPosition();
    this.history = [];
  }

  public generateLegalMoves(): Move[] {
    return generateLegalMoves(this.position);
  }

  public makeMove(move: Move): void {
    const undo = makeMove(this.position, move);
    
    this.history.push({move, undo});
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
}

export default ChessEngine;
