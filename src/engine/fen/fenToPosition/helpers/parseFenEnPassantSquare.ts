import { getCurrentRank } from "../../../helpers/main";
import parseFenFieldToSquare from "./parseFenFieldToSquare";

const parseFenEnPassantSquare = (field: string) => {
  if (field === "-") {
    return null;
  }

  const enPassantSquare = parseFenFieldToSquare(field);
  const rank = getCurrentRank(enPassantSquare);

  if (rank !== 2 && rank !== 5) {
    throw new Error("Invalid en passant square");
  }

  return enPassantSquare;
};

export default parseFenEnPassantSquare;
