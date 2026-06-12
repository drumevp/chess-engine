import { getCurrentRank } from "../../../helpers/main";
import { standardNotationSquareToInternalSquare } from "../../../notation/converters/square";

const parseFenEnPassantSquare = (field: string) => {
  if (field === "-") {
    return null;
  }

  const enPassantSquare = standardNotationSquareToInternalSquare(field);
  const rank = getCurrentRank(enPassantSquare);

  if (rank !== 2 && rank !== 5) {
    throw new Error("Invalid en passant square");
  }

  return enPassantSquare;
};

export default parseFenEnPassantSquare;
