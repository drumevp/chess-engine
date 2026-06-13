/**
 * Explicitly defining NOT masks to prevent bit length inaccuracy
 */

import { Bitboard } from "../types/bitboard";

export const FULL_BOARD_MASK: Bitboard = 0xffffffffffffffffn;

export const A_FILE_MASK: Bitboard = 0x0101010101010101n;
export const NOT_A_FILE_MASK: Bitboard = FULL_BOARD_MASK ^ A_FILE_MASK;

export const B_FILE_MASK: Bitboard = 0x0202020202020202n;
export const NOT_B_FILE_MASK: Bitboard = FULL_BOARD_MASK ^ B_FILE_MASK;

export const NOT_A_B_FILE_MASK: Bitboard = NOT_A_FILE_MASK & NOT_B_FILE_MASK;

export const H_FILE_MASK: Bitboard = 0x8080808080808080n;
export const NOT_H_FILE_MASK: Bitboard = FULL_BOARD_MASK ^ H_FILE_MASK;

export const G_FILE_MASK: Bitboard = 0x4040404040404040n;
export const NOT_G_FILE_MASK: Bitboard = FULL_BOARD_MASK ^ G_FILE_MASK;

export const NOT_H_G_FILE_MASK: Bitboard = NOT_H_FILE_MASK & NOT_G_FILE_MASK;

export const RANK_8_MASK: Bitboard = 0xff00000000000000n;
export const NOT_RANK_8_MASK: Bitboard = FULL_BOARD_MASK ^ RANK_8_MASK;

export const RANK_7_MASK: Bitboard = 0x00ff000000000000n;
export const NOT_RANK_7_MASK: Bitboard = FULL_BOARD_MASK ^ RANK_7_MASK;

export const NOT_RANK_7_8_MASK: Bitboard = NOT_RANK_7_MASK & NOT_RANK_8_MASK;

export const RANK_1_MASK: Bitboard = 0x00000000000000ffn;
export const NOT_RANK_1_MASK: Bitboard = FULL_BOARD_MASK ^ RANK_1_MASK;

export const RANK_2_MASK: Bitboard = 0x000000000000ff00n;
export const NOT_RANK_2_MASK: Bitboard = FULL_BOARD_MASK ^ RANK_2_MASK;

export const NOT_RANK_1_2_MASK: Bitboard = NOT_RANK_1_MASK & NOT_RANK_2_MASK;

export const DARK_SQUARES_MASK: bigint = 0xaa55aa55aa55aa55n;
export const LIGHT_SQUARES_MASK: bigint = 0x55aa55aa55aa55aan;

// dark 1010101001010101101010100101010110101010010101011010101001010101 - AA55AA55AA55AA55
// light 0101010110101010010101011010101001010101101010100101010110101010 - 55AA55AA55AA55AA

export const LOWER_32_BITS_MASK = 0xffffffffn;
