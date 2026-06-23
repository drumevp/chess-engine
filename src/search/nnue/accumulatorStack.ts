import { COLOR } from "../../engine/constants/color";
import { MOVE_FLAG } from "../../engine/constants/move";
import { KING_INDEX } from "../../engine/constants/piece";
import getPieceTypeFromStateIndex from "../../engine/helpers/getPieceTypeFromStateIndex";
import {
  moveDecodeColor,
  moveDecodeFlag,
  moveDecodeFrom,
  moveDecodePiece,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../../engine/position/moves/packedMove";
import type { Undo } from "../../engine/types/history";
import type { ColorType } from "../../engine/types/color";
import type { Position } from "../../engine/types/position";
import {
  NNUE_ACCUMULATOR_STACK_CAPACITY,
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type {
  NnueAccumulatorBackend,
  NnueAccumulatorStack,
  NnueScratch,
  NnueWeights,
} from "../types/nnue";
import {
  addHalfKaFeature,
  refreshHalfKaAccumulator,
  removeHalfKaFeature,
} from "./accumulator";
import { getPieceColorFromStateIndex } from "./features";
import { createWasmAccumulatorView } from "./wasmAccumulator";

const getSlot = (ply: number, perspective: ColorType): number =>
  ply * 2 + (perspective === COLOR.WHITE ? 0 : 1);

const createAccumulator = (
  slot: number,
  accumulatorBackend?: NnueAccumulatorBackend,
): Int32Array =>
  accumulatorBackend === undefined
    ? new Int32Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS)
    : createWasmAccumulatorView(accumulatorBackend, slot);

export const createNnueAccumulatorStack = (
  capacity = NNUE_ACCUMULATOR_STACK_CAPACITY,
  accumulatorBackend?: NnueAccumulatorBackend,
): NnueAccumulatorStack => {
  if (
    accumulatorBackend !== undefined &&
    capacity * 2 > accumulatorBackend.accumulatorSlotCount
  ) {
    throw new RangeError(
      `NNUE accumulator capacity ${capacity} exceeds WASM capacity ${
        accumulatorBackend.accumulatorSlotCount / 2
      }`,
    );
  }

  return {
    currentPly: 0,
    accumulatorBackend,
    whiteAccumulators: Array.from({ length: capacity }, (_, i) =>
      createAccumulator(i * 2, accumulatorBackend),
    ),
    blackAccumulators: Array.from({ length: capacity }, (_, i) =>
      createAccumulator(i * 2 + 1, accumulatorBackend),
    ),
    whitePsqtAccumulators: Array.from(
      { length: capacity },
      () => new Int32Array(NNUE_PSQ_BUCKETS),
    ),
    blackPsqtAccumulators: Array.from(
      { length: capacity },
      () => new Int32Array(NNUE_PSQ_BUCKETS),
    ),
  };
};

export const resetNnueAccumulatorStack = (
  stack: NnueAccumulatorStack,
  weights: NnueWeights,
  position: Position,
  scratch: NnueScratch,
): void => {
  stack.currentPly = 0;

  refreshNnueAccumulatorStackFrame(stack, weights, position, scratch, 0);
};

export const refreshNnueAccumulatorStackFrame = (
  stack: NnueAccumulatorStack,
  weights: NnueWeights,
  position: Position,
  scratch: NnueScratch,
  ply: number,
): void => {
  refreshHalfKaAccumulator(
    weights,
    position,
    COLOR.WHITE,
    scratch.activeFeatures,
    stack.whiteAccumulators[ply],
    stack.whitePsqtAccumulators[ply],
    getSlot(ply, COLOR.WHITE),
    stack.accumulatorBackend,
  );
  refreshHalfKaAccumulator(
    weights,
    position,
    COLOR.BLACK,
    scratch.activeFeatures,
    stack.blackAccumulators[ply],
    stack.blackPsqtAccumulators[ply],
    getSlot(ply, COLOR.BLACK),
    stack.accumulatorBackend,
  );
};

const copyParentAccumulators = (
  stack: NnueAccumulatorStack,
  parentPly: number,
  childPly: number,
): void => {
  stack.whiteAccumulators[childPly].set(stack.whiteAccumulators[parentPly]);
  stack.blackAccumulators[childPly].set(stack.blackAccumulators[parentPly]);
  stack.whitePsqtAccumulators[childPly].set(
    stack.whitePsqtAccumulators[parentPly],
  );
  stack.blackPsqtAccumulators[childPly].set(
    stack.blackPsqtAccumulators[parentPly],
  );
};

const applyFeatureDeltaForBothPerspectives = (
  weights: NnueWeights,
  stack: NnueAccumulatorStack,
  ply: number,
  square: number,
  pieceColor: ColorType,
  piece: number,
  whiteKingSquare: number,
  blackKingSquare: number,
  direction: 1 | -1,
): void => {
  const whiteAccumulator = stack.whiteAccumulators[ply];
  const blackAccumulator = stack.blackAccumulators[ply];
  const whitePsqtAccumulator = stack.whitePsqtAccumulators[ply];
  const blackPsqtAccumulator = stack.blackPsqtAccumulators[ply];
  const whiteUpdate = direction === 1 ? addHalfKaFeature : removeHalfKaFeature;
  const blackUpdate = direction === 1 ? addHalfKaFeature : removeHalfKaFeature;

  whiteUpdate(
    weights,
    COLOR.WHITE,
    square,
    pieceColor,
    piece,
    whiteKingSquare,
    whiteAccumulator,
    whitePsqtAccumulator,
    getSlot(ply, COLOR.WHITE),
    stack.accumulatorBackend,
  );
  blackUpdate(
    weights,
    COLOR.BLACK,
    square,
    pieceColor,
    piece,
    blackKingSquare,
    blackAccumulator,
    blackPsqtAccumulator,
    getSlot(ply, COLOR.BLACK),
    stack.accumulatorBackend,
  );
};

const applyFeatureDeltaForPerspective = (
  weights: NnueWeights,
  stack: NnueAccumulatorStack,
  ply: number,
  perspective: ColorType,
  square: number,
  pieceColor: ColorType,
  piece: number,
  kingSquare: number,
  direction: 1 | -1,
): void => {
  const update = direction === 1 ? addHalfKaFeature : removeHalfKaFeature;
  const accumulator =
    perspective === COLOR.WHITE
      ? stack.whiteAccumulators[ply]
      : stack.blackAccumulators[ply];
  const psqtAccumulator =
    perspective === COLOR.WHITE
      ? stack.whitePsqtAccumulators[ply]
      : stack.blackPsqtAccumulators[ply];

  update(
    weights,
    perspective,
    square,
    pieceColor,
    piece,
    kingSquare,
    accumulator,
    psqtAccumulator,
    getSlot(ply, perspective),
    stack.accumulatorBackend,
  );
};

const isCastlingMove = (move: number): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return (
    moveFlag === MOVE_FLAG.KING_CASTLE ||
    moveFlag === MOVE_FLAG.QUEEN_CASTLE
  );
};

export const pushNnueAccumulatorStack = (
  stack: NnueAccumulatorStack,
  weights: NnueWeights,
  position: Position,
  move: number,
  undo: Undo,
  scratch: NnueScratch,
): void => {
  const parentPly = stack.currentPly;
  const childPly = parentPly + 1;

  if (childPly >= stack.whiteAccumulators.length) {
    throw new Error("NNUE accumulator stack capacity exceeded");
  }

  if (isCastlingMove(move)) {
    stack.currentPly = childPly;
    refreshNnueAccumulatorStackFrame(stack, weights, position, scratch, childPly);

    return;
  }

  copyParentAccumulators(stack, parentPly, childPly);
  stack.currentPly = childPly;

  const moveFrom = moveDecodeFrom(move);
  const moveTo = moveDecodeTo(move);
  const moveColor = moveDecodeColor(move);
  const movePiece = moveDecodePiece(move);
  const movePromotionPiece = moveDecodePromotionPiece(move);
  const addedPiece = movePromotionPiece ?? movePiece;
  const whiteKingSquare = undo.previousWhiteKingSquare;
  const blackKingSquare = undo.previousBlackKingSquare;

  if (movePiece === KING_INDEX) {
    const opposingPerspective =
      moveColor === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;
    const opposingKingSquare =
      opposingPerspective === COLOR.WHITE
        ? whiteKingSquare
        : blackKingSquare;

    refreshHalfKaAccumulator(
      weights,
      position,
      moveColor,
      scratch.activeFeatures,
      moveColor === COLOR.WHITE
        ? stack.whiteAccumulators[childPly]
        : stack.blackAccumulators[childPly],
      moveColor === COLOR.WHITE
        ? stack.whitePsqtAccumulators[childPly]
        : stack.blackPsqtAccumulators[childPly],
      getSlot(childPly, moveColor),
      stack.accumulatorBackend,
    );

    applyFeatureDeltaForPerspective(
      weights,
      stack,
      childPly,
      opposingPerspective,
      moveFrom,
      moveColor,
      movePiece,
      opposingKingSquare,
      -1,
    );

    if (
      undo.capturedSquare !== null &&
      undo.capturedPieceStateIndex !== null
    ) {
      applyFeatureDeltaForPerspective(
        weights,
        stack,
        childPly,
        opposingPerspective,
        undo.capturedSquare,
        getPieceColorFromStateIndex(undo.capturedPieceStateIndex),
        getPieceTypeFromStateIndex(undo.capturedPieceStateIndex),
        opposingKingSquare,
        -1,
      );
    }

    applyFeatureDeltaForPerspective(
      weights,
      stack,
      childPly,
      opposingPerspective,
      moveTo,
      moveColor,
      addedPiece,
      opposingKingSquare,
      1,
    );

    return;
  }

  applyFeatureDeltaForBothPerspectives(
    weights,
    stack,
    childPly,
    moveFrom,
    moveColor,
    movePiece,
    whiteKingSquare,
    blackKingSquare,
    -1,
  );

  if (
    undo.capturedSquare !== null &&
    undo.capturedPieceStateIndex !== null
  ) {
    applyFeatureDeltaForBothPerspectives(
      weights,
      stack,
      childPly,
      undo.capturedSquare,
      getPieceColorFromStateIndex(undo.capturedPieceStateIndex),
      getPieceTypeFromStateIndex(undo.capturedPieceStateIndex),
      whiteKingSquare,
      blackKingSquare,
      -1,
    );
  }

  applyFeatureDeltaForBothPerspectives(
    weights,
    stack,
    childPly,
    moveTo,
    moveColor,
    addedPiece,
    whiteKingSquare,
    blackKingSquare,
    1,
  );
};

export const popNnueAccumulatorStack = (
  stack: NnueAccumulatorStack,
): void => {
  if (stack.currentPly > 0) {
    stack.currentPly--;
  }
};
