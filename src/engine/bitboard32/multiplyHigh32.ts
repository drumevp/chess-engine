/**
 * Multiply two 32 bit numbers to get the HIGH bit part from the 64 bit product
 * If we use Math.imul, we will get the low bit part.
 *
 * So this function calculates the product of the two 32bit values
 * and returns the high part of the bits.
 *
 */

import { LOW_16_BITS_MASK } from "../constants/mask";

const multiplyHigh32 = (a: number, b: number): number => {
  const aLow = a & LOW_16_BITS_MASK;
  const aHigh = a >>> 16;
  const bLow = b & LOW_16_BITS_MASK;
  const bHigh = b >>> 16;

  const lowProduct = Math.imul(aLow, bLow);
  let middle = lowProduct >>> 16;
  middle = (middle + Math.imul(aHigh, bLow)) >>> 0;

  let high = middle >>> 16;
  middle = ((middle & LOW_16_BITS_MASK) + Math.imul(aLow, bHigh)) >>> 0;
  high = (high + (middle >>> 16) + Math.imul(aHigh, bHigh)) >>> 0;

  return high;
};

export default multiplyHigh32;
