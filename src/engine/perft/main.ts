/**
 * Counting the legal moves for a certain depth.
 * Updated this so we don't create any new array objects on each iteration for performance.
 */

import generateAttackInfo, {
  createAttackInfo,
} from "../movegen/attackInfo/main";
import generateLegalMovesFromContext from "../movegen/generateLegalMovesFromContext";
import getMoveGenerationContext, {
  createMoveGenerationContext,
} from "../movegen/getMoveGenerationContext";
import { createMoveList } from "../movegen/moveList";
import { Position } from "../types/position";
import { MoveGenerationContext, MoveList } from "../types/move";
import undoMove from "../position/moves/undoMove/undoMove";
import { AttackInfo } from "../types/attackInfo";
import { Undo } from "../types/history";
import { makeMoveWithUndo } from "../position/moves/makeMove/makeMove";
import { createUndo } from "../constants/history";

const perftRecursive = (
  position: Position,
  depth: number,
  ply: number,
  moveLists: MoveList[],
  contexts: MoveGenerationContext[],
  attackInfos: AttackInfo[],
  undoStack: Undo[],
): number => {
  if (depth <= 0) {
    return 1;
  }

  const moveList = moveLists[ply];
  const ctx = getMoveGenerationContext(position, moveList, contexts[ply]);
  const attackInfo = generateAttackInfo(ctx, attackInfos[ply]);
  const count = generateLegalMovesFromContext(ctx, attackInfo);

  if (depth === 1) {
    return count;
  }

  let nodes = 0;

  for (let i = 0; i < count; i++) {
    const move = moveList.moves[i];
    const undo = undoStack[ply];

    makeMoveWithUndo(position, move, undo, { updateZobristHash: false });
    nodes += perftRecursive(
      position,
      depth - 1,
      ply + 1,
      moveLists,
      contexts,
      attackInfos,
      undoStack,
    );
    undoMove(position, move, undo);
  }

  return nodes;
};

const perft = (position: Position, depth: number): number => {
  const moveLists = Array.from({ length: depth }, () => createMoveList());
  const contexts = moveLists.map((moveList) =>
    createMoveGenerationContext(moveList),
  );
  const attackInfos = Array.from({ length: depth }, () => createAttackInfo());
  const undoStack = Array.from({ length: depth }, () => createUndo());

  return perftRecursive(
    position,
    depth,
    0,
    moveLists,
    contexts,
    attackInfos,
    undoStack,
  );
};

export default perft;
