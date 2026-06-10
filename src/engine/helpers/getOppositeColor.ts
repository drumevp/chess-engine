import { COLOR } from "../constants/color";
import { ColorType } from "../types/color";


const getOppositeColor = (color: ColorType): ColorType => {
  if (color === COLOR.WHITE) {
    return COLOR.BLACK;
  }

  return COLOR.WHITE
}
export default getOppositeColor;