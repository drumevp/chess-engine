import getOccupiedPiecesBitmap from "./state/getPiecesOccupied";
import { calculatePieceIndex, COLOR, INITIAL_STATE, PAWN_INDEX, ROOK_INDEX, type ColorType } from "./state/initialState";

class ChessEngine {
  turn: ColorType; // 0 White | 1 Black
  time: number;
  halfMoveClock: number; // If 50 moves are made without a capture or a pawn move, game ends in a draw
  move: number; // Current move number. Increments every time black ends their turn
  
  
  // Bitmap state variables
  state: bigint[]; // 12x64bit bitboards defining the state of each class of piece by color
  whitePiecesOccupied: bigint;
  blackPiecesOccupied: bigint;
  allPiecesOccupied: bigint;

  constructor()  {
    this.turn = COLOR.WHITE;
    this.time = 10 * 1000 * 60 * 10; // TODO: implement ms to min fns
    this.halfMoveClock = 0;
    this.move = 1;

    this.state = INITIAL_STATE;
    this.whitePiecesOccupied = getOccupiedPiecesBitmap(this.state.splice(ROOK_INDEX, PAWN_INDEX));
    this.blackPiecesOccupied = getOccupiedPiecesBitmap(this.state.splice(calculatePieceIndex(COLOR.BLACK, ROOK_INDEX), calculatePieceIndex(COLOR.BLACK, PAWN_INDEX)));
    this.allPiecesOccupied = getOccupiedPiecesBitmap(this.state);
  }

  public init() {

  }
}

export default ChessEngine;