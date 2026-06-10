import getOppositeColor from "../../../../helpers/getOppositeColor";
import { Position } from "../../../../types/position";

const updateSideToMove = (position: Position) => {
  position.color = getOppositeColor(position.color);
};

export default updateSideToMove;
