import generatePseudoLegalMoves from "./moves/generatePseudoLegalMoves";
import { createInitialPosition } from "./state/initialState";
import { type Position } from "./types/main";

class ChessEngine {
  position: Position;

  constructor()  {
    this.position = createInitialPosition();
  }

  public init() {
    // test

    const pseudoLegalMovesWhite = generatePseudoLegalMoves(this.position);
    console.log(pseudoLegalMovesWhite);
  }
}

export default ChessEngine;