import { PAWN_INDEX } from "../../state/initialState";
import { MOVE_FLAG, type MoveFlagType, type Position } from "../../types/main";

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
