import type { ColorType } from "../types/main";

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
};