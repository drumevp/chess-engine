import type { ColorType } from "../types/main";
import type { MoveList } from "./moveList";

export type MoveGenerationContext = {
  state: bigint[];
  color: ColorType;
  ownOccupancy: bigint;
  enemyOccupancy: bigint;
  allOccupancy: bigint;
  pieceAt: Int8Array;
  ownKingSquare: number;
  enemyKingSquare: number;
  enPassantSquare: number | null;
  castlingRights: number;
  moves: MoveList;
};
