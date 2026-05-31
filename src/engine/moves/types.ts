import type { ColorType } from "../types/main";

export type MoveGenerationContext = {
  state: bigint[];
  color: ColorType;
  ownOccupancy: bigint;
  enemyOccupancy: bigint;
  allOccupancy: bigint;
};