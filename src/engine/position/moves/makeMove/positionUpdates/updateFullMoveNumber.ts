import { COLOR } from "../../../../constants/color";
import { Position } from "../../../../types/position";


const updateFullMoveNumber = (position: Position) => {
  if (position.color === COLOR.BLACK) {
    position.fullMoveNumber += 1;
  }
};

export default updateFullMoveNumber;
