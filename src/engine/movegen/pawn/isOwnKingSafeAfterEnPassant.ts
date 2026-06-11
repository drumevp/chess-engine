import generateBishopAttacks from "../../attacks/bishop";
import generateRookAttacks from "../../attacks/rook";
import { FULL_BOARD_MASK } from "../../constants/mask";
import { BISHOP_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../constants/piece";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import { Bitboard } from "../../types/bitboard";
import { ColorType } from "../../types/color";

const isOwnKingSafeAfterEnPassant = (
  allOccupancy: Bitboard,
  state: Bitboard[],
  originSquareBitboard: Bitboard, // Origin square from pawn that is attacking
  targetEnPassantPawnBitboard: Bitboard, // Origin square for pawn that is being captured
  enPassantSquareBitboard: Bitboard, // En passant square
  ownKingSquare: number,
  enemyColor: ColorType,
): boolean => {
  // Remove the origin pawn, target en pessant pawn and add the new pawn position
  // To generate new occupancy for king legality check
  const occupancyAfterEnPassant =
    (allOccupancy &
      (FULL_BOARD_MASK ^ originSquareBitboard) &
      (FULL_BOARD_MASK ^ targetEnPassantPawnBitboard)) |
    enPassantSquareBitboard;

  const rookAttacks = generateRookAttacks(
    ownKingSquare,
    occupancyAfterEnPassant,
  );
  const bishopAttacks = generateBishopAttacks(
    ownKingSquare,
    occupancyAfterEnPassant,
  );

  const enemyRooks = state[calculatePieceIndex(enemyColor, ROOK_INDEX)];
  const enemyBishops = state[calculatePieceIndex(enemyColor, BISHOP_INDEX)];
  const enemyQueens = state[calculatePieceIndex(enemyColor, QUEEN_INDEX)];

  const rookExposure = (rookAttacks & (enemyRooks | enemyQueens)) === 0n;
  const bishopExposure = (bishopAttacks & (enemyBishops | enemyQueens)) === 0n;
  const isEnPassantMoveLegal = rookExposure && bishopExposure;

  if (!isEnPassantMoveLegal) {
    return false;
  }

  return true;
};

export default isOwnKingSafeAfterEnPassant;
