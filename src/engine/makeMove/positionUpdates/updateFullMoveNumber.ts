import { COLOR, type Position } from "../../types/main";

const updateFullMoveNumber = (position: Position) => {
  if (position.color === COLOR.BLACK) {
    position.fullMoveNumber += 1;
  }
};

export default updateFullMoveNumber;
