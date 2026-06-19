import { MOVE_FLAG } from "../../engine/constants/move";
import { moveDecodeFlag } from "../../engine/position/moves/packedMove";
import { KILLER_MOVES_PER_PLY } from "../constants/killerMoves";
import type { KillerMoves } from "../types/killerMoves";

const getKillerMoveIndex = (ply: number, slot: number): number =>
  ply * KILLER_MOVES_PER_PLY + slot;

export const createKillerMoves = (plyCount: number): KillerMoves => {
  const size = plyCount * KILLER_MOVES_PER_PLY;

  return {
    moves: new Uint32Array(size),
    hasMove: new Uint8Array(size),
  };
};

export const isKillerMoveCandidate = (move: number): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return (
    moveFlag === MOVE_FLAG.QUIET ||
    moveFlag === MOVE_FLAG.DOUBLE_PAWN_PUSH ||
    moveFlag === MOVE_FLAG.KING_CASTLE ||
    moveFlag === MOVE_FLAG.QUEEN_CASTLE
  );
};

export const isKillerMove = (
  killerMoves: KillerMoves,
  ply: number,
  move: number,
): boolean => {
  const firstIndex = getKillerMoveIndex(ply, 0);
  const secondIndex = getKillerMoveIndex(ply, 1);

  return (
    (killerMoves.hasMove[firstIndex] !== 0 &&
      killerMoves.moves[firstIndex] === move) ||
    (killerMoves.hasMove[secondIndex] !== 0 &&
      killerMoves.moves[secondIndex] === move)
  );
};

export const recordKillerMove = (
  killerMoves: KillerMoves,
  ply: number,
  move: number,
): void => {
  if (!isKillerMoveCandidate(move)) {
    return;
  }

  const firstIndex = getKillerMoveIndex(ply, 0);

  if (
    killerMoves.hasMove[firstIndex] !== 0 &&
    killerMoves.moves[firstIndex] === move
  ) {
    return;
  }

  const secondIndex = getKillerMoveIndex(ply, 1);

  killerMoves.moves[secondIndex] = killerMoves.moves[firstIndex];
  killerMoves.hasMove[secondIndex] = killerMoves.hasMove[firstIndex];
  killerMoves.moves[firstIndex] = move;
  killerMoves.hasMove[firstIndex] = 1;
};
