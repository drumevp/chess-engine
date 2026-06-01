import generateLegalMoves from "./moves/generateLegalMoves";
import { createInitialPosition } from "./state/initialState";
import { type Position } from "./types/main";

class ChessEngine {
  position: Position;

  constructor()  {
    this.position = createInitialPosition();
  }

  public init() {
    // test

    const legalMovesWhite = generateLegalMoves(this.position);
    console.log(legalMovesWhite);
  }
}

export default ChessEngine;