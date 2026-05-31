import generatePseudoLegalMoves from "./moves/generatePseudoLegalMoves";
import generateKnightMoves from "./moves/knight";
import getOccupiedPiecesBitmap from "./state/getPiecesOccupied";
import { calculatePieceIndex,  INITIAL_STATE, PAWN_INDEX, ROOK_INDEX } from "./state/initialState";
import { COLOR, type ColorType } from "./types/main";

class ChessEngine {
  turn: ColorType; // 0 White | 1 Black
  time: number;
  halfMoveClock: number; // If 50 moves are made without a capture or a pawn move, game ends in a draw
  move: number; // Current move number. Increments every time black ends their turn
  
  
  // Bitmap state variables
  state: bigint[]; // 12x64bit bitboards defining the state of each class of piece by color
  whiteOccupancy: bigint;
  blackOccupancy: bigint;
  allOccupancy: bigint;

  constructor()  {
    this.turn = COLOR.WHITE;
    this.time = 10 * 1000 * 60 * 10; // TODO: implement ms to min fns
    this.halfMoveClock = 0;
    this.move = 1;

    this.state = [...INITIAL_STATE];
    this.whiteOccupancy = getOccupiedPiecesBitmap(this.state.slice(ROOK_INDEX, PAWN_INDEX + 1));
    this.blackOccupancy = getOccupiedPiecesBitmap(this.state.slice(calculatePieceIndex(COLOR.BLACK, ROOK_INDEX), calculatePieceIndex(COLOR.BLACK, PAWN_INDEX) + 1));
    this.allOccupancy = getOccupiedPiecesBitmap(this.state);
  }

  public init() {
    // test

    const pseudoLegalMovesWhite = generatePseudoLegalMoves({allOccupancy: this.allOccupancy, color: COLOR.WHITE, enemyOccupancy: this.blackOccupancy, ownOccupancy: this.whiteOccupancy, state: this.state});
    console.log(pseudoLegalMovesWhite);

    const pseudoLegalMovesBlack = generatePseudoLegalMoves({allOccupancy: this.allOccupancy, color: COLOR.BLACK, enemyOccupancy: this.whiteOccupancy, ownOccupancy: this.blackOccupancy, state: this.state});
    console.log(pseudoLegalMovesBlack);
  }
}

export default ChessEngine;