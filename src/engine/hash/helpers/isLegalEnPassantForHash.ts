import isOwnKingSafeAfterEnPassant from "../../movegen/pawn/isOwnKingSafeAfterEnPassant";
import { squareBitboards } from "../../tables/importTables";
import { ColorType } from "../../types/color";
import { Position } from "../../types/position";

const isLegalEnPassantForHash = (
  position: Position,
  pawnOriginSquare: number,
  enPassantSquare: number,
  capturedPawnSquare: number,
  enemyColor: ColorType,
): boolean => {
  const originSquareBitboard = squareBitboards[pawnOriginSquare];
  const targetEnPassantPawnBitboard = squareBitboards[capturedPawnSquare];
  const enPassantBitboard = squareBitboards[enPassantSquare];

  const ownKingSquare = position.kingSquares[position.color];

  return isOwnKingSafeAfterEnPassant(
    position.allOccupancy,
    position.state,
    originSquareBitboard,
    targetEnPassantPawnBitboard,
    enPassantBitboard,
    ownKingSquare,
    enemyColor,
  );
};

export default isLegalEnPassantForHash;
