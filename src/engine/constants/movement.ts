/**
 * 
  north     = << 8
  south     = >> 8
  east      = << 1
  west      = >> 1

  north-east = << 9
  north-west = << 7
  south-east = >> 7
  south-west = >> 9
 */

import {NOT_A_FILE_MASK, NOT_H_FILE_MASK, NOT_RANK_1_MASK, NOT_RANK_8_MASK } from "./masks";

export const moveNorth = (bitboard: bigint) => (bitboard & NOT_RANK_8_MASK) << 8n;
export const moveSouth = (bitboard: bigint) => (bitboard & NOT_RANK_1_MASK) >> 8n;
export const moveEast = (bitboard: bigint) => (bitboard & NOT_H_FILE_MASK)  << 1n;
export const moveWest = (bitboard: bigint) => (bitboard & NOT_A_FILE_MASK) >> 1n;
export const moveNorthEast = (bitboard: bigint) => (bitboard & NOT_H_FILE_MASK & NOT_RANK_8_MASK) << 9n;
export const moveNorthWest = (bitboard: bigint) => (bitboard & NOT_A_FILE_MASK & NOT_RANK_8_MASK) << 7n;
export const moveSouthEast = (bitboard: bigint) => (bitboard & NOT_H_FILE_MASK & NOT_RANK_1_MASK) >> 7n;
export const moveSouthWest = (bitboard: bigint) => (bitboard & NOT_A_FILE_MASK & NOT_RANK_1_MASK) >> 9n;

