import { NUMBER_OF_PIECE_CATEGORIES } from "../../../engine/constants/piece";
import { STATIC_EXCHANGE_MAX_DEPTH } from "../../constants/staticExchangeEvaluation";
import { StaticExchangeEvaluationScratch } from "../../types/staticExchangeEvaluation";

export const createStaticExchangeEvaluationScratch =
  (): StaticExchangeEvaluationScratch => ({
    stateLo: new Uint32Array(NUMBER_OF_PIECE_CATEGORIES * 2),
    stateHi: new Uint32Array(NUMBER_OF_PIECE_CATEGORIES * 2),
    gain: new Int32Array(STATIC_EXCHANGE_MAX_DEPTH),
    attackScratch: {
      lo: 0,
      hi: 0,
    },
    simulatedAllOccupancyLo: 0,
    simulatedAllOccupancyHi: 0,
    attackersLo: 0,
    attackersHi: 0,
    attackerPiece: -1,
    attackerSquare: -1,
    attackerStateIndex: -1,
  });
