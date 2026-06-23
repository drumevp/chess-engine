import generateLegalMoves from "../../src/engine/movegen/generateLegalMoves";
import { COLOR } from "../../src/engine/constants/color";
import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import internalToUci from "../../src/engine/notation/uci/internalToUci";
import { createInitialPosition } from "../../src/engine/position/initialPosition";
import { makeMoveWithUndo } from "../../src/engine/position/moves/makeMove/makeMove";
import {
  moveDecodeFrom,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../../src/engine/position/moves/packedMove";
import undoMove from "../../src/engine/position/moves/undoMove/undoMove";
import { createUndo, type Undo } from "../../src/engine/types/history";
import type { Position } from "../../src/engine/types/position";
import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import {
  NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../../src/search/constants/nnue";
import { appendFullThreatActiveFeatures } from "../../src/search/nnue/fullThreats";
import {
  createNnueEvaluator,
  evaluateNnue,
} from "../../src/search/nnue/inference";
import { createSeededRandom, getRandomInt } from "../../src/search/nnue/random";
import { createNnueScratch } from "../../src/search/nnue/scratch";
import type { NnueModel, SearchEvaluator } from "../../src/search/types/nnue";

type NamedCase = {
  name: string;
  fen: string;
  uci: string;
};

type MoveRecord = {
  move: number;
  undo: Undo;
};

type EvaluatorIsolationCase = {
  name: string;
  evaluator: SearchEvaluator;
  position: Position;
  moveRecord?: MoveRecord;
};

const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const LAYER_STACK_FENS = [
  "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
  "r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1",
  "r3k2r/8/8/8/8/8/8/RNBQKBNR w - - 0 1",
  "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w - - 0 1",
  "rnbqkbnr/pppppppp/8/8/8/8/8/R3K2R w - - 0 1",
  "rnbqkbnr/pppppppp/8/8/8/8/8/RNBQKBNR w - - 0 1",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPP4/RNBQKBNR w - - 0 1",
  INITIAL_FEN,
] as const;

const NAMED_CASES: NamedCase[] = [
  {
    name: "quiet",
    fen: INITIAL_FEN,
    uci: "b1a3",
  },
  {
    name: "capture",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2",
    uci: "e4d5",
  },
  {
    name: "en-passant",
    fen: "rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2",
    uci: "e5d6",
  },
  {
    name: "white-kingside-castle",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    uci: "e1g1",
  },
  {
    name: "black-queenside-castle",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1",
    uci: "e8c8",
  },
  {
    name: "king-move-refresh",
    fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
    uci: "e1e2",
  },
  {
    name: "promotion",
    fen: "k7/4P3/8/8/8/8/8/7K w - - 0 1",
    uci: "e7e8q",
  },
  {
    name: "promotion-capture",
    fen: "k6r/6P1/8/8/8/8/8/7K w - - 0 1",
    uci: "g7h8q",
  },
];

const moveToUci = (move: number): string =>
  internalToUci({
    from: moveDecodeFrom(move),
    to: moveDecodeTo(move),
    promotionPiece: moveDecodePromotionPiece(move),
  });

const findLegalMove = (position: Position, uci: string): number => {
  const moves = generateLegalMoves(position);

  for (const move of moves) {
    if (moveToUci(move) === uci) {
      return move;
    }
  }

  throw new Error(`Could not find legal move ${uci}`);
};

const assertAccumulatorMatchesFullRefresh = (
  model: NnueModel,
  evaluator: SearchEvaluator,
  position: Position,
  label: string,
): number => {
  const incrementalScore = evaluator.evaluate(position);
  const fullRefreshScore = evaluateNnue(model, position, createNnueScratch());

  if (incrementalScore !== fullRefreshScore) {
    throw new Error(
      `${label}: incremental ${incrementalScore} !== full-refresh ${fullRefreshScore}`,
    );
  }

  return fullRefreshScore;
};

const verifyNamedCase = (
  model: NnueModel,
  evaluator: SearchEvaluator,
  testCase: NamedCase,
): void => {
  const position = generateFenToPosition(testCase.fen);

  evaluator.reset?.(position);
  const rootScore = assertAccumulatorMatchesFullRefresh(
    model,
    evaluator,
    position,
    `${testCase.name}: root`,
  );
  const move = findLegalMove(position, testCase.uci);
  const undo = createUndo();

  makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
  evaluator.pushMove?.(position, move, undo);
  assertAccumulatorMatchesFullRefresh(
    model,
    evaluator,
    position,
    `${testCase.name}: child`,
  );

  undoMove(position, move, undo);
  evaluator.popMove?.();

  const poppedScore = assertAccumulatorMatchesFullRefresh(
    model,
    evaluator,
    position,
    `${testCase.name}: pop`,
  );

  if (poppedScore !== rootScore) {
    throw new Error(
      `${testCase.name}: popped root ${poppedScore} !== original root ${rootScore}`,
    );
  }
};

const verifyRandomSequences = (
  model: NnueModel,
  evaluator: SearchEvaluator,
): void => {
  const random = createSeededRandom(0x7a11ce55);
  const sequenceCount = 16;
  const maxPlies = 24;

  for (let sequence = 0; sequence < sequenceCount; sequence++) {
    const position = createInitialPosition();
    const history: MoveRecord[] = [];

    evaluator.reset?.(position);
    assertAccumulatorMatchesFullRefresh(
      model,
      evaluator,
      position,
      `random-${sequence}: root`,
    );

    for (let ply = 0; ply < maxPlies; ply++) {
      const moves = generateLegalMoves(position);

      if (moves.length === 0) {
        break;
      }

      const move = moves[getRandomInt(random, 0, moves.length - 1)];
      const undo = createUndo();

      makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
      evaluator.pushMove?.(position, move, undo);
      history.push({ move, undo });
      assertAccumulatorMatchesFullRefresh(
        model,
        evaluator,
        position,
        `random-${sequence}: ply-${ply + 1}`,
      );
    }

    for (let ply = history.length - 1; ply >= 0; ply--) {
      const record = history[ply];

      undoMove(position, record.move, record.undo);
      evaluator.popMove?.();
      assertAccumulatorMatchesFullRefresh(
        model,
        evaluator,
        position,
        `random-${sequence}: undo-${history.length - ply}`,
      );
    }
  }
};

const verifyLayerStacks = (
  model: NnueModel,
  evaluator: SearchEvaluator,
): void => {
  for (let stack = 0; stack < LAYER_STACK_FENS.length; stack++) {
    const position = generateFenToPosition(LAYER_STACK_FENS[stack]);

    evaluator.reset?.(position);
    assertAccumulatorMatchesFullRefresh(
      model,
      evaluator,
      position,
      `layer-stack-${stack}`,
    );
  }
};

const verifyEvaluatorIsolation = (
  model: NnueModel,
  existingWasmEvaluator: SearchEvaluator,
): void => {
  const cases: EvaluatorIsolationCase[] = [
    {
      name: "existing-wasm",
      evaluator: existingWasmEvaluator,
      position: createInitialPosition(),
    },
    {
      name: "typescript-created-after-wasm",
      evaluator: createNnueEvaluator(model, { backend: "typescript" }),
      position: generateFenToPosition(LAYER_STACK_FENS[4]),
    },
    {
      name: "second-wasm",
      evaluator: createNnueEvaluator(model, { backend: "wasm" }),
      position: generateFenToPosition(LAYER_STACK_FENS[6]),
    },
  ];

  for (const testCase of cases) {
    testCase.evaluator.reset?.(testCase.position);
  }

  for (const testCase of cases) {
    assertAccumulatorMatchesFullRefresh(
      model,
      testCase.evaluator,
      testCase.position,
      `${testCase.name}: isolated-root`,
    );

    const move = generateLegalMoves(testCase.position)[0];
    const undo = createUndo();

    makeMoveWithUndo(testCase.position, move, undo, {
      updateZobristHash: true,
    });
    testCase.evaluator.pushMove?.(testCase.position, move, undo);
    testCase.moveRecord = { move, undo };
  }

  for (const testCase of cases) {
    assertAccumulatorMatchesFullRefresh(
      model,
      testCase.evaluator,
      testCase.position,
      `${testCase.name}: isolated-child`,
    );
  }

  for (let i = cases.length - 1; i >= 0; i--) {
    const testCase = cases[i];
    const record = testCase.moveRecord;

    if (record === undefined) {
      throw new Error(`${testCase.name}: missing isolation move record`);
    }

    undoMove(testCase.position, record.move, record.undo);
    testCase.evaluator.popMove?.();
    assertAccumulatorMatchesFullRefresh(
      model,
      testCase.evaluator,
      testCase.position,
      `${testCase.name}: isolated-pop`,
    );
  }
};

const verifyFullThreatForwardIsolation = (model: NnueModel): void => {
  const position = createInitialPosition();
  const activeFeatures = new Uint32Array(
    NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  );
  const activeFeatureCount = appendFullThreatActiveFeatures(
    position,
    COLOR.WHITE,
    activeFeatures,
    0,
    { lo: 0, hi: 0 },
  );

  if (activeFeatureCount === 0) {
    throw new Error("full-threat-isolation: expected active features");
  }

  const weightOffset =
    activeFeatures[0] * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;
  const previousWeights = model.weights.threatWeights.slice(
    weightOffset,
    weightOffset + NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );

  model.weights.threatWeights.fill(
    64,
    weightOffset,
    weightOffset + NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );

  try {
    const fullThreatModel: NnueModel = {
      ...model,
      metadata: { ...model.metadata, fullThreats: true },
    };
    const evaluator = createNnueEvaluator(fullThreatModel, {
      backend: "wasm",
    });

    evaluator.reset?.(position);
    const rootScore = assertAccumulatorMatchesFullRefresh(
      fullThreatModel,
      evaluator,
      position,
      "full-threat-isolation: root",
    );
    const move = generateLegalMoves(position)[0];
    const undo = createUndo();

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
    evaluator.pushMove?.(position, move, undo);
    assertAccumulatorMatchesFullRefresh(
      fullThreatModel,
      evaluator,
      position,
      "full-threat-isolation: child",
    );

    undoMove(position, move, undo);
    evaluator.popMove?.();
    const poppedScore = assertAccumulatorMatchesFullRefresh(
      fullThreatModel,
      evaluator,
      position,
      "full-threat-isolation: pop",
    );

    if (poppedScore !== rootScore) {
      throw new Error(
        `full-threat-isolation: popped ${poppedScore} !== root ${rootScore}`,
      );
    }
  } finally {
    model.weights.threatWeights.set(previousWeights, weightOffset);
  }
};

const model = await createDefaultNnueModel();
const evaluator = createNnueEvaluator(model, { backend: "wasm" });

for (const testCase of NAMED_CASES) {
  verifyNamedCase(model, evaluator, testCase);
}

verifyLayerStacks(model, evaluator);
verifyRandomSequences(model, evaluator);
verifyEvaluatorIsolation(model, evaluator);
verifyFullThreatForwardIsolation(model);

console.log(
  JSON.stringify({
    namedCases: NAMED_CASES.length,
    layerStacks: LAYER_STACK_FENS.length,
    randomSequences: 16,
    randomMaxPlies: 24,
    isolatedEvaluators: 3,
    fullThreatForwardIsolation: true,
  }),
);
