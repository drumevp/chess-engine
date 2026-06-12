import { STANDARD_NOTATION_PIECE_TO_INTERNAL_PIECE, VALID_STANDARD_NOTATION_PROMOTION_PIECES } from "../../constants/notation";
import { SimpleMove } from "../../types/move";
import { standardNotationSquareToInternalSquare } from "../converters/square";

const uciToInternal = (uci: string): SimpleMove => {
  // Validate e2e4 | e7e8q
  if (uci.length !== 4 && uci.length !== 5) {
    throw new Error('Invalid uci string');
  }

  const [uciSquare1, uciSquare2, promotion] = [uci.slice(0, 2), uci.slice(2, 4), uci.slice(4)];

  const from = standardNotationSquareToInternalSquare(uciSquare1);
  const to = standardNotationSquareToInternalSquare(uciSquare2);
  let promotionPiece = null;

  if(promotion !== '') {
    const isPromotionPieceValid = VALID_STANDARD_NOTATION_PROMOTION_PIECES.includes(promotion);

    if (!isPromotionPieceValid) {
      throw new Error('Invalid promotion piece');
    }

    promotionPiece = STANDARD_NOTATION_PIECE_TO_INTERNAL_PIECE[promotion];
  }

  return {
    from,
    to,
    promotionPiece
  }
}

export default uciToInternal;
