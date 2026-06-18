import { MOVE_FLAG } from "../../engine/constants/move";
import { moveDecodeFlag } from "../../engine/position/moves/packedMove";

export const MAX_QUIESCENCE_PLY = 64;

export const isQuiescenceMove = (move: number): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return (
    moveFlag === MOVE_FLAG.CAPTURE ||
    moveFlag === MOVE_FLAG.PROMOTION_CAPTURE ||
    moveFlag === MOVE_FLAG.EN_PASSANT ||
    moveFlag === MOVE_FLAG.PROMOTION
  );
};
