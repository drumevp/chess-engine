import { internalSquareToStandardNotationSquare } from "../../../notation/converters/square";
import { Position } from "../../../types/position";
/**
  * '-' for null
  * standard chess notation for a value: ex e1 or h5
 */

const getFenEnPassantSquareFromPosition = (position: Position): string => {
  if (position.enPassantSquare === null) {
    return '-';
  }

  return internalSquareToStandardNotationSquare(position.enPassantSquare);
}

export default getFenEnPassantSquareFromPosition;