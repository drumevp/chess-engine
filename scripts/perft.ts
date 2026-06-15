/**
 * This script tests the validity of the legal moves the engine generates by
 * initiating the engine with various position (from a FEN string) and running it
 * at from depth 1 to 4 or 5.
 *
 * Obtained the test values from https://www.chessprogramming.org/Perft_Results
 */

import { ChessEngine } from "../dist/index.cjs";
import { parseArgs } from "node:util";

type PerftTestCase = {
  name: string;
  fen: string;
  nodes: number[]; // each index + 1 of the array corresponds to depth
};

const PERFT_TEST_VALUES: PerftTestCase[] = [
  {
    name: "Initial",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    nodes: [20, 400, 8902, 197281, 4865609],
  },
  {
    name: "Kiwipete",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    nodes: [48, 2039, 97862, 4085603, 193690690],
  },
  {
    name: "Position 3",
    fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    nodes: [14, 191, 2812, 43238, 674624],
  },
  {
    name: "Position 4",
    fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    nodes: [6, 264, 9467, 422333, 15833292],
  },
  {
    name: "Position 5",
    fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
    nodes: [44, 1486, 62379, 2103487, 89941194],
  },
];

const { values } = parseArgs({
  options: {
    "max-depth": {
      default: "4",
      type: "string",
      short: "d",
    },
  },
});

const maxDepth = Number(values["max-depth"]);

if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 5) {
  throw new Error(
    "Invalid argument value for max-depth. Value must be an integer from 1 to 5",
  );
}

function formatDuration(ms: number): string {
  // 1000 ms = 1s
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }

  // 1000ms * 60 = 1min
  if (ms < 1000 * 60) {
    return `${(ms / 1000).toFixed(2)}s`;
  }

  // 1000ms * 60 * 60 = 1hr
  if (ms < 1000 * 60 * 60) {
    return `${(ms / (1000 * 60)).toFixed(2)}m`;
  }

  return `${(ms / (1000 * 60 * 60)).toFixed(2)}hr`;
}

const main = () => {
  console.log("--- Running perft tests ---\n");

  for (const testCase of PERFT_TEST_VALUES) {
    console.log(`Running ${testCase.name}`);

    for (let depth = 0; depth < maxDepth; depth++) {
      const perfStart = performance.now();
      const chessEngine = new ChessEngine(testCase.fen);
      const perftResult = chessEngine.perft(depth + 1);
      const perfEnd = performance.now();

      const isResultCorrect = testCase.nodes[depth] === perftResult;
      const nps = `${(perftResult / ((perfEnd - perfStart) / 1000) / 1_000_000).toFixed(2)}M nps`;

      console.log(
        `Depth: ${depth + 1} - ${perftResult} - ${isResultCorrect} - ${formatDuration(perfEnd - perfStart)} - ${nps}`,
      );
    }
  }
};

main();
