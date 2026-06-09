import { getCurrentFile, getCurrentRank } from "../../../helpers/main";
import { Position } from "../../../types/main";
import { INTERNAL_FILE_TO_FEN_FILE } from "../constants";
/**
  * '-' for null
  * normal chess notation for a value: ex e1 or h5
 */

const getFenEnPassantSquareFromPosition = (position: Position): string => {
  if (position.enPassantSquare === null) {
    return '-';
  }

  const rank = getCurrentRank(position.enPassantSquare);
  const file = getCurrentFile(position.enPassantSquare);

  return `${INTERNAL_FILE_TO_FEN_FILE[file]}${rank + 1}`;
}

export default getFenEnPassantSquareFromPosition;