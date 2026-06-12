import { INTERNAL_PIECE_TO_STANDARD_NOTATION_PIECE } from "../../constants/notation";
import { SimpleMove } from "../../types/move";
import { internalSquareToStandardNotationSquare } from "../converters/square";

const internalToUci = (move: SimpleMove): string => {
  const uciFrom = internalSquareToStandardNotationSquare(move.from);
  const uciTo = internalSquareToStandardNotationSquare(move.to);
  let uciPromotion = '';

  if (move.promotionPiece !== null) {
    uciPromotion = INTERNAL_PIECE_TO_STANDARD_NOTATION_PIECE[move.promotionPiece];
  }

  return uciFrom + uciTo + uciPromotion;
}

export default internalToUci;
