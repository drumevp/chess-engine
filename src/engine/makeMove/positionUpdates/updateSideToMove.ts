import getOppositeColor from "../../helpers/getOppositeColor";
import type { Position } from "../../types/main";

const updateSideToMove = (position: Position) => {
  position.color = getOppositeColor(position.color);
};

export default updateSideToMove;
