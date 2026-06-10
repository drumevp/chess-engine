import { MOVE_FLAG } from "../../../../constants/move";
import { PAWN_INDEX } from "../../../../constants/piece";
import { MoveFlagType } from "../../../../types/move";
import { Position } from "../../../../types/position";

const updateHalfMoveClock = (position: Position, moveFlag: MoveFlagType, movePiece: number) => {
  const isPawnMove = movePiece === PAWN_INDEX;

  const isCapture =
    moveFlag === MOVE_FLAG.CAPTURE ||
    moveFlag === MOVE_FLAG.PROMOTION_CAPTURE ||
    moveFlag=== MOVE_FLAG.EN_PASSANT;

  if (isPawnMove || isCapture) {
    position.halfMoveClock = 0;

    return;
  }

  position.halfMoveClock += 1;
};

export default updateHalfMoveClock;
