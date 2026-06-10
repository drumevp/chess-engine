import {NOT_A_B_FILE_MASK, NOT_A_FILE_MASK, NOT_H_FILE_MASK, NOT_H_G_FILE_MASK, NOT_RANK_1_2_MASK, NOT_RANK_1_MASK, NOT_RANK_7_8_MASK, NOT_RANK_8_MASK } from "../constants/mask";
import { Bitboard } from "../types/bitboard";

/**
 * One square movement definitions - typically used for king & pawns
 * assets/kingMovement.png
 * 
  N = (bitboard & NOT_RANK_8) << 8
  E = (bitboard & NOT_H_FILE) << 1
  S = (bitboard & NOT_RANK_1) >> 8
  W = (bitboard & NOT_A_FILE) >> 1
  NW = (bitboard & NOT_A_FILE & NOT_RANK_8) << 7
  NE = (bitboard & NOT_H_FILE & NOT_RANK_8) << 9
  SE = (bitboard & NOT_H_FILE & NOT_RANK_1) >> 7
  SW = (bitboard & NOT_A_FILE & NOT_RANK_1) >> 9
 */
export const N = (bitboard: Bitboard):Bitboard => (bitboard & NOT_RANK_8_MASK) << 8n;
export const NN = (bitboard: Bitboard): Bitboard => (bitboard & NOT_RANK_7_8_MASK) << 16n;
export const S = (bitboard: Bitboard):Bitboard => (bitboard & NOT_RANK_1_MASK) >> 8n;
export const SS = (bitboard: Bitboard):Bitboard => (bitboard & NOT_RANK_1_2_MASK) >> 16n;
export const E = (bitboard: Bitboard):Bitboard => (bitboard & NOT_H_FILE_MASK)  << 1n;
export const W = (bitboard: Bitboard):Bitboard => (bitboard & NOT_A_FILE_MASK) >> 1n;
export const NE = (bitboard: Bitboard):Bitboard => (bitboard & NOT_H_FILE_MASK & NOT_RANK_8_MASK) << 9n;
export const NW = (bitboard: Bitboard):Bitboard => (bitboard & NOT_A_FILE_MASK & NOT_RANK_8_MASK) << 7n;
export const SE = (bitboard: Bitboard):Bitboard => (bitboard & NOT_H_FILE_MASK & NOT_RANK_1_MASK) >> 7n;
export const SW = (bitboard: Bitboard):Bitboard => (bitboard & NOT_A_FILE_MASK & NOT_RANK_1_MASK) >> 9n;

/**
 * Knight movement definitions
 * assets/knightMovement.png
 * 
  NNW = (bitboard & NOT_A_FILE & NOT_RANK_7_8) << 15
  NNE = (bitboard & NOT_H_FILE & NOT_RANK_7_8) << 17
  WWN = (bitboard & NOT_A_B_FILE & NOT_RANK_8) << 6
  WWS = (bitboard & NOT_A_B_FILE & NOT_RANK_1) >> 10
  SSW = (bitboard & NOT_RANK_1_2 & NOT_A_FILE) >> 17
  SSE = (bitboard & NOT_RANK_1_2 & NOT_H_FILE) >> 15
  EEN = (bitboard & NOT_G_H_FILE & NOT_RANK_8) << 10
  EES = (bitboard & NOT_G_H_FILE & NOT_RANK_1) >> 6
 */

export const moveNNW = (bitboard: Bitboard): Bitboard => (bitboard & NOT_A_FILE_MASK & NOT_RANK_7_8_MASK) << 15n;
export const moveNNE = (bitboard: Bitboard): Bitboard => (bitboard & NOT_H_FILE_MASK & NOT_RANK_7_8_MASK) << 17n;
export const moveWWN = (bitboard: Bitboard): Bitboard => (bitboard & NOT_A_B_FILE_MASK & NOT_RANK_8_MASK) << 6n;
export const moveWWS = (bitboard: Bitboard): Bitboard => (bitboard & NOT_A_B_FILE_MASK & NOT_RANK_1_MASK) >> 10n;
export const moveSSW = (bitboard: Bitboard): Bitboard => (bitboard & NOT_RANK_1_2_MASK & NOT_A_FILE_MASK) >> 17n;
export const moveSSE = (bitboard: Bitboard): Bitboard => (bitboard & NOT_RANK_1_2_MASK & NOT_H_FILE_MASK) >> 15n;
export const moveEEN = (bitboard: Bitboard): Bitboard => (bitboard & NOT_H_G_FILE_MASK & NOT_RANK_8_MASK) << 10n;
export const moveEES = (bitboard: Bitboard): Bitboard => (bitboard & NOT_H_G_FILE_MASK & NOT_RANK_1_MASK) >> 6n;
