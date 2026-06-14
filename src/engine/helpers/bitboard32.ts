import { LOWER_32_BITS_MASK_BIGINT } from "../constants/mask";

export const lo32FromBigint = (bitboard: bigint): number =>
  Number(bitboard & LOWER_32_BITS_MASK_BIGINT) >>> 0;

export const hi32FromBigint = (bitboard: bigint): number =>
  Number((bitboard >> 32n) & LOWER_32_BITS_MASK_BIGINT) >>> 0;
