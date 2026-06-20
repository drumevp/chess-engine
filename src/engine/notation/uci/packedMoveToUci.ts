import internalToUci from "./internalToUci";
import {
  moveDecodeFrom,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../../position/moves/packedMove";

const packedMoveToUci = (move: number): string =>
  internalToUci({
    from: moveDecodeFrom(move),
    to: moveDecodeTo(move),
    promotionPiece: moveDecodePromotionPiece(move),
  });

export default packedMoveToUci;
