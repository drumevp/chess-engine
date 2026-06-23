import ChessEngine from "../../src/engine/ChessEngine";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import iterativeDeepeningSearch from "../../src/search/iterativeDeepeningSearch";
import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import { createNnueEvaluator } from "../../src/search/nnue/inference";

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);

  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const depth = Number(getArg("--depth", "16"));
const moves = getArg("--moves", "")
  .split(",")
  .map((move) => move.trim())
  .filter(Boolean);
const engine = new ChessEngine();

for (const move of moves) {
  engine.makeUciMove(move);
}

const position = generateFenToPosition(engine.exportFen());
const evaluator = createNnueEvaluator(await createDefaultNnueModel());

iterativeDeepeningSearch(
  position,
  new Map([[position.zobristHash, 1]]),
  depth,
  {},
  evaluator,
  null,
  undefined,
  (result) => console.log(JSON.stringify(result)),
);
