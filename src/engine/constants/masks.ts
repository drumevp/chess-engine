/**
 * Explicitly defining NOT masks to prevent bit length inaccuracy
 */

const FULL_BOARD_MASK: bigint = 0xffffffffffffffffn;


export const A_FILE_MASK: bigint = 0x0101010101010101n;
export const NOT_A_FILE_MASK: bigint = FULL_BOARD_MASK ^ A_FILE_MASK;

export const H_FILE_MASK: bigint = 0x8080808080808080n;
export const NOT_H_FILE_MASK: bigint = FULL_BOARD_MASK ^ H_FILE_MASK;


export const RANK_8_MASK: bigint = 0xff00000000000000n;
export const NOT_RANK_8_MASK: bigint = FULL_BOARD_MASK ^ RANK_8_MASK;

export const RANK_7_MASK: bigint = 0x00ff000000000000n;
export const NOT_RANK_7_MASK: bigint = FULL_BOARD_MASK ^ RANK_7_MASK;

export const RANK_1_MASK: bigint = 0x00000000000000ffn;
export const NOT_RANK_1_MASK: bigint = FULL_BOARD_MASK ^ RANK_1_MASK;

export const RANK_2_MASK: bigint = 0x000000000000ff00n;
export const NOT_RANK_2_MASK: bigint = FULL_BOARD_MASK ^ RANK_2_MASK;