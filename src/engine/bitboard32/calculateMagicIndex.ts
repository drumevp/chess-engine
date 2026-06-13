/**
 * To get the magic index, we only care about the HIGH 32bits of the 64bit product
 */

import multiplyHigh32 from "./multiplyHigh32";

export const calculateMagicIndex = (
  blockersLo: number,
  blockersHi: number,
  magicLo: number,
  magicHi: number,
  shift: number,
): number => {
  const productHi =
    (multiplyHigh32(blockersLo, magicLo) +
      Math.imul(blockersLo, magicHi) +
      Math.imul(blockersHi, magicLo)) >>>
    0;

  if (shift >= 32) {
    return productHi >>> (shift - 32);
  }

  const productLo = Math.imul(blockersLo, magicLo) >>> 0;

  return ((productLo >>> shift) | (productHi << (32 - shift))) >>> 0;
};

export default calculateMagicIndex;
