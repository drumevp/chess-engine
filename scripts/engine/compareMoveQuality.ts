import { resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import { UciClient, type UciScore } from "../../src/uci/UciClient";

const POSITIONS = [
  "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 10",
  "4rrk1/pp1n3p/3q2pQ/2p1pb2/2PP4/2P3N1/P2B2PP/4RRK1 b - - 7 19",
  "r3r1k1/2p2ppp/p1p1bn2/8/1q2P3/2NPQN2/PPP3PP/R4RK1 b - - 2 15",
  "r1bbk1nr/pp3p1p/2n5/1N4p1/2Np1B2/8/PPP2PPP/2KR1B1R w kq - 0 13",
  "r1bq1rk1/ppp1nppp/4n3/3p3Q/3P4/1BP1B3/PP1N2PP/R4RK1 w - - 1 16",
  "4r1k1/r1q2ppp/ppp2n2/4P3/5Rb1/1N1BQ3/PPP3PP/R5K1 w - - 1 17",
  "2rqkb1r/ppp2p2/2npb1p1/1N1Nn2p/2P1PP2/8/PP2B1PP/R1BQK2R b KQ - 0 11",
  "r1bq1r1k/b1p1npp1/p2p3p/1p6/3PP3/1B2NN2/PP3PPP/R2Q1RK1 w - - 1 16",
  "3r1rk1/p5pp/bpp1pp2/8/q1PP1P2/b3P3/P2NQRPP/1R2B1K1 b - - 6 22",
  "r1q2rk1/2p1bppp/2Pp4/p6b/Q1PNp3/4B3/PP1R1PPP/2K4R w - - 2 18",
  "3q2k1/pb3p1p/4pbp1/2r5/PpN2N2/1P2P2P/5PP1/Q2R2K1 b - - 4 26",
  "4k3/3q1r2/1N2r1b1/3ppN2/2nPP3/1B1R2n1/2R1Q3/3K4 w - - 5 1",
] as const;

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);

  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const scoreToCp = (score: UciScore | null): number => {
  if (score === null) {
    return 0;
  }

  if (score.type === "mate") {
    return Math.sign(score.value) * (20_000 - Math.abs(score.value));
  }

  return score.value;
};

const applyMove = (fen: string, move: string): string => {
  const engine = new ChessEngine(fen);
  engine.makeUciMove(move);

  return engine.exportFen();
};

const candidate = new UciClient(
  resolve(getArg("--candidate", "dist/drumevp-chess-engine.js")),
  { timeoutMs: 120_000 },
);
const baseline = new UciClient(
  resolve(getArg("--baseline", "dist/drumevp-chess-engine.js")),
  { timeoutMs: 120_000 },
);
const stockfish = new UciClient(
  resolve(getArg("--stockfish", "engines/stockfish/src/stockfish")),
  { timeoutMs: 120_000 },
);
const engineNodes = Number(getArg("--engine-nodes", "50000"));
const stockfishNodes = Number(getArg("--stockfish-nodes", "250000"));

await Promise.all([
  candidate.initialize(),
  baseline.initialize(),
  stockfish.initialize(),
]);
await Promise.all([
  candidate.setOption("Hash", 128),
  baseline.setOption("Hash", 128),
  stockfish.setOption("Hash", 128),
]);

let candidateLossTotal = 0;
let baselineLossTotal = 0;
let candidateAgreements = 0;
let baselineAgreements = 0;

try {
  for (let index = 0; index < POSITIONS.length; index++) {
    const fen = POSITIONS[index];
    const [candidateResult, baselineResult, stockfishResult] = await Promise.all([
      candidate.analyze(fen, { nodes: engineNodes }),
      baseline.analyze(fen, { nodes: engineNodes }),
      stockfish.analyze(fen, { nodes: stockfishNodes }),
    ]);
    const rootScore = scoreToCp(stockfishResult.score);
    const candidateFen = applyMove(fen, candidateResult.bestMove);
    const baselineFen = applyMove(fen, baselineResult.bestMove);
    const candidateChild = await stockfish.analyze(candidateFen, {
      nodes: stockfishNodes,
    });
    const baselineChild =
      candidateFen === baselineFen
        ? null
        : await stockfish.analyze(baselineFen, { nodes: stockfishNodes });
    const candidateMoveScore = -scoreToCp(candidateChild.score);
    const baselineMoveScore =
      baselineChild === null
        ? candidateMoveScore
        : -scoreToCp(baselineChild.score);
    const candidateLoss = Math.max(0, rootScore - candidateMoveScore);
    const baselineLoss = Math.max(0, rootScore - baselineMoveScore);

    candidateLossTotal += candidateLoss;
    baselineLossTotal += baselineLoss;
    candidateAgreements += Number(
      candidateResult.bestMove === stockfishResult.bestMove,
    );
    baselineAgreements += Number(
      baselineResult.bestMove === stockfishResult.bestMove,
    );

    console.log(
      JSON.stringify({
        position: index + 1,
        stockfish: stockfishResult.bestMove,
        candidate: candidateResult.bestMove,
        baseline: baselineResult.bestMove,
        candidateLoss,
        baselineLoss,
      }),
    );
  }
} finally {
  candidate.close();
  baseline.close();
  stockfish.close();
}

console.log(
  JSON.stringify({
    positions: POSITIONS.length,
    candidateAgreements,
    baselineAgreements,
    candidateAverageLoss: candidateLossTotal / POSITIONS.length,
    baselineAverageLoss: baselineLossTotal / POSITIONS.length,
  }),
);
