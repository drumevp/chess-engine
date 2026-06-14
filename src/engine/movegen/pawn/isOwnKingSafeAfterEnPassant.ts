import isSquareAttackedBySlidersWithOccupancy from "../../helpers/isSquareAttackedBySlidersWithOccupancy";
import { Bitboard32 } from "../../types/bitboard";
import { ColorType } from "../../types/color";

const isOwnKingSafeAfterEnPassant = (
  allOccupancyLo: number,
  allOccupancyHi: number,
  stateLo: Uint32Array,
  stateHi: Uint32Array,

  // Origin square from pawn that is attacking
  originSquareBitboardLo: number,
  originSquareBitboardHi: number,

  // Origin square for pawn that is being captured
  targetEnPassantPawnBitboardLo: number,
  targetEnPassantPawnBitboardHi: number,

  // En passant square
  enPassantSquareBitboardLo: number,
  enPassantSquareBitboardHi: number,
  ownKingSquare: number,
  enemyColor: ColorType,

  out: Bitboard32,
): boolean => {
  // Remove the origin pawn, target en pessant pawn and add the new pawn position
  // To generate new occupancy for king legality check
  const occupancyAfterEnPassantLo =
    ((allOccupancyLo &
      ~originSquareBitboardLo &
      ~targetEnPassantPawnBitboardLo) |
      enPassantSquareBitboardLo) >>>
    0;

  const occupancyAfterEnPassantHi =
    ((allOccupancyHi &
      ~originSquareBitboardHi &
      ~targetEnPassantPawnBitboardHi) |
      enPassantSquareBitboardHi) >>>
    0;

  return !isSquareAttackedBySlidersWithOccupancy(
    ownKingSquare,
    enemyColor,
    stateLo,
    stateHi,
    occupancyAfterEnPassantLo,
    occupancyAfterEnPassantHi,
    out,
  );
};

export default isOwnKingSafeAfterEnPassant;
