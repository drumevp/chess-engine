import generatePositionFromFen from "./fen/generatePositionFromFen";
import makeMove from "./makeMove/makeMove";
import generateLegalMoves from "./moves/generateLegalMoves";
import { moveDecodeCapturedPiece, moveDecodeColor, moveDecodeFlag, moveDecodeFrom, moveDecodePiece, moveDecodePromotionPiece, moveDecodeTo } from "./packedMove/main";
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

  public generateLegalMoves(): number[] {
    return generateLegalMoves(this.position);
  }

  public generateLegalMovesForFrontend(): Move[] {
    const encodedMoves = generateLegalMoves(this.position);

    return encodedMoves.map((move) => {
      return {
        from: moveDecodeFrom(move),
        to: moveDecodeTo(move),
        color: moveDecodeColor(move),
        flag: moveDecodeFlag(move),
        piece: moveDecodePiece(move),
        capturedPiece: moveDecodeCapturedPiece(move),
        promotionPiece: moveDecodePromotionPiece(move),
      }
    });
  }

  public makeMove(move: number): void {
    const undo = makeMove(this.position, move);

    this.history.push({ move, undo });
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
