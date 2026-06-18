/**
 * Principal variation
 *
 * https://www.chessprogramming.org/Principal_Variation
 */

import { SearchScratch } from "../types/search";

export const resetPrincipalVariation = (
  scratch: SearchScratch,
  ply: number,
): void => {
  if (ply < scratch.pvLength.length) {
    scratch.pvLength[ply] = ply;
  }
};

export const updatePrincipalVariation = (
  scratch: SearchScratch,
  ply: number,
  move: number,
): void => {
  const nextPly = ply + 1;
  const row = scratch.pvTable[ply];
  const childLength =
    nextPly < scratch.pvLength.length ? scratch.pvLength[nextPly] : nextPly;
  const pvLength = Math.min(childLength, row.length);

  row[ply] = move;

  for (let currentPly = nextPly; currentPly < pvLength; currentPly++) {
    row[currentPly] = scratch.pvTable[nextPly][currentPly];
  }

  scratch.pvLength[ply] = pvLength;
};

export const getPrincipalVariation = (scratch: SearchScratch): number[] => {
  const pvLength = scratch.pvLength[0];
  const pv: number[] = [];

  for (let ply = 0; ply < pvLength; ply++) {
    pv.push(scratch.pvTable[0][ply]);
  }

  return pv;
};
