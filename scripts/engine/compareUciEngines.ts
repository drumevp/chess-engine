import { resolve } from "node:path";
import ChessEngine from "../../src/engine/ChessEngine";
import { COLOR } from "../../src/engine/constants/color";
import { UciClient } from "../../src/uci/UciClient";
import { MATCH_OPENING_LINES } from "./matchOpenings";

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);

  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const engineAPath = resolve(getArg("--engine-a", "dist/drumevp-chess-engine.js"));
const engineBPath = resolve(getArg("--engine-b", "dist/drumevp-chess-engine.js"));
const nodes = Number(getArg("--nodes", "5000"));
const maxPly = Number(getArg("--max-ply", "160"));
const openingCount = Math.min(
  MATCH_OPENING_LINES.length,
  Number(getArg("--openings", String(MATCH_OPENING_LINES.length))),
);
const hashMb = Number(getArg("--hash", "128"));

const engineA = new UciClient(engineAPath, { timeoutMs: 120_000 });
const engineB = new UciClient(engineBPath, { timeoutMs: 120_000 });

await Promise.all([engineA.initialize(), engineB.initialize()]);
await Promise.all([
  engineA.setOption("Threads", 1),
  engineB.setOption("Threads", 1),
  engineA.setOption("Hash", hashMb),
  engineB.setOption("Hash", hashMb),
]);

let winsA = 0;
let winsB = 0;
let draws = 0;

try {
  for (let openingIndex = 0; openingIndex < openingCount; openingIndex++) {
    const opening = MATCH_OPENING_LINES[openingIndex];

    for (let colorIndex = 0; colorIndex < 2; colorIndex++) {
      await Promise.all([engineA.newGame(), engineB.newGame()]);

      const game = new ChessEngine();
      const moves: string[] = [...opening];

      for (const move of moves) {
        game.makeUciMove(move);
      }

      const engineAColor =
        colorIndex === 0 ? COLOR.WHITE : COLOR.BLACK;

      while (!game.isGameOver() && moves.length < maxPly) {
        const client = game.turn() === engineAColor ? engineA : engineB;
        const { bestMove } = await client.analyzePosition(
          { startPosition: true, moves },
          { nodes },
        );

        if (bestMove === "0000") {
          break;
        }

        game.makeUciMove(bestMove);
        moves.push(bestMove);
      }

      let result = "draw";

      if (game.isCheckmate()) {
        const winner = game.turn() === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;

        if (winner === engineAColor) {
          winsA++;
          result = "A";
        } else {
          winsB++;
          result = "B";
        }
      } else {
        draws++;
      }

      const gameNumber = openingIndex * 2 + colorIndex + 1;
      console.log(
        `${gameNumber}/${openingCount * 2} opening=${openingIndex + 1} A=${engineAColor === COLOR.WHITE ? "white" : "black"} result=${result} ply=${moves.length}`,
      );
    }
  }
} finally {
  engineA.close();
  engineB.close();
}

const games = winsA + winsB + draws;
const scoreA = games === 0 ? 0 : (winsA + draws / 2) / games;

console.log(
  JSON.stringify({ games, winsA, winsB, draws, scoreA }, null, 2),
);
