import { GAME_END_REASON, GAME_STATE } from "../constants/gameState";

export type GameState = (typeof GAME_STATE)[keyof typeof GAME_STATE];

export type GameEndReason =
  (typeof GAME_END_REASON)[keyof typeof GAME_END_REASON];
