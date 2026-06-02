import makeMove from "./makeMove/makeMove";
import generateLegalMoves from "./moves/generateLegalMoves";
import { createInitialPosition } from "./state/initialState";
import { type Move, type Position } from "./types/main";

class ChessEngine {
  position: Position;

  constructor() {
    this.position = createInitialPosition();
  }

  public generateLegalMoves(): Move[] {
    return generateLegalMoves(this.position);
  }

  public makeMove(move: Move): void {
    makeMove(this.position, move);
  }
}

export default ChessEngine;
