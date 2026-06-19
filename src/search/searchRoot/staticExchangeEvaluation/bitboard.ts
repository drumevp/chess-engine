import {
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../../engine/tables/importTables";
import { StaticExchangeEvaluationScratch } from "../../types/staticExchangeEvaluation";

export const addPiece = (
  scratch: StaticExchangeEvaluationScratch,
  square: number,
  stateIndex: number,
): void => {
  scratch.stateLo[stateIndex] =
    (scratch.stateLo[stateIndex] | squareBitboardsLo[square]) >>> 0;
  scratch.stateHi[stateIndex] =
    (scratch.stateHi[stateIndex] | squareBitboardsHi[square]) >>> 0;
};

export const removePiece = (
  scratch: StaticExchangeEvaluationScratch,
  square: number,
  stateIndex: number,
): void => {
  scratch.stateLo[stateIndex] =
    (scratch.stateLo[stateIndex] & ~squareBitboardsLo[square]) >>> 0;
  scratch.stateHi[stateIndex] =
    (scratch.stateHi[stateIndex] & ~squareBitboardsHi[square]) >>> 0;
};

export const removeOccupancy = (
  scratch: StaticExchangeEvaluationScratch,
  square: number,
): void => {
  scratch.simulatedAllOccupancyLo =
    (scratch.simulatedAllOccupancyLo & ~squareBitboardsLo[square]) >>> 0;
  scratch.simulatedAllOccupancyHi =
    (scratch.simulatedAllOccupancyHi & ~squareBitboardsHi[square]) >>> 0;
};

export const addOccupancy = (
  scratch: StaticExchangeEvaluationScratch,
  square: number,
): void => {
  scratch.simulatedAllOccupancyLo =
    (scratch.simulatedAllOccupancyLo | squareBitboardsLo[square]) >>> 0;
  scratch.simulatedAllOccupancyHi =
    (scratch.simulatedAllOccupancyHi | squareBitboardsHi[square]) >>> 0;
};
