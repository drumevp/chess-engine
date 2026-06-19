import { COLOR } from "../../src/engine/constants/color";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import { NNUE_FULL_THREATS_FEATURE_DIMENSIONS } from "../../src/search/constants/nnue";
import { appendFullThreatActiveFeatures } from "../../src/search/nnue/fullThreats";

const POSITIONS = [
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
  "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
  "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
];

const activeFeatures = new Uint32Array(128);
const attackScratch = { lo: 0, hi: 0 };
let maxFeature = 0;
let totalFeatures = 0;

for (const fen of POSITIONS) {
  const position = generateFenToPosition(fen);

  for (const perspective of [COLOR.WHITE, COLOR.BLACK]) {
    const count = appendFullThreatActiveFeatures(
      position,
      perspective,
      activeFeatures,
      0,
      attackScratch,
    );

    totalFeatures += count;

    for (let i = 0; i < count; i++) {
      const feature = activeFeatures[i];

      if (feature >= NNUE_FULL_THREATS_FEATURE_DIMENSIONS) {
        throw new Error(`FullThreats feature out of range: ${feature}`);
      }

      if (feature > maxFeature) {
        maxFeature = feature;
      }
    }
  }
}

console.log(
  JSON.stringify({
    positions: POSITIONS.length,
    totalFeatures,
    maxFeature,
    dimensions: NNUE_FULL_THREATS_FEATURE_DIMENSIONS,
  }),
);
