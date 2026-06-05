import generatePositionFromFen from "./fen/generatePositionFromFen";
import makeMove from "./makeMove/makeMove";
import generateLegalMovesWrapper from "./moves/generateLegalMovesWrapper";
import {
  moveDecodeCapturedPiece,
  moveDecodeColor,
  moveDecodeFlag,
  moveDecodeFrom,
  moveDecodePiece,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "./packedMove/main";
import perft from "./perft/main";
import { createInitialPosition } from "./state/initialState";
import type { History } from "./types/history";
import { type Move, type Position } from "./types/main";
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
    return generateLegalMovesWrapper(this.position);
  }

  public generateDecodedLegalMoves(): Move[] {
    const encodedMoves = generateLegalMovesWrapper(this.position);

    const moves: Move[] = [];

    encodedMoves.forEach((move) => {
      moves.push({
        encodedMove: move,
        from: moveDecodeFrom(move),
        to: moveDecodeTo(move),
        color: moveDecodeColor(move),
        flag: moveDecodeFlag(move),
        piece: moveDecodePiece(move),
        capturedPiece: moveDecodeCapturedPiece(move),
        promotionPiece: moveDecodePromotionPiece(move),
      });
    });

    return moves;
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
}

export default ChessEngine;
