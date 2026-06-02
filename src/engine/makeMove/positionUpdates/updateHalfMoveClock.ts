import { PAWN_INDEX } from "../../state/initialState";
import { MOVE_FLAG, type Move, type Position } from "../../types/main";

const updateHalfMoveClock = (position: Position, move: Move) => {
  const isPawnMove = move.piece === PAWN_INDEX;

  const isCapture =
    move.flag === MOVE_FLAG.CAPTURE ||
    move.flag === MOVE_FLAG.PROMOTION_CAPTURE ||
    move.flag === MOVE_FLAG.EN_PASSANT;

  if (isPawnMove || isCapture) {
    position.halfMoveClock = 0;

    return;
  }

  position.halfMoveClock += 1;
};

export default updateHalfMoveClock;
