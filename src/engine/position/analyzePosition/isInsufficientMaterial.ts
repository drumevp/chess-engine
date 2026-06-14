import { COLOR } from "../../constants/color";
import { DARK_SQUARES_MASK, LIGHT_SQUARES_MASK } from "../../constants/mask";
import {
  BISHOP_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../constants/piece";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import { hi32FromBigint, lo32FromBigint } from "../../helpers/bitboard32";
import countRelevantBits from "../../helpers/countRelevantBits";
import { ColorType } from "../../types/color";
import { Position } from "../../types/position";

const LIGHT_SQUARES_MASK_LO = lo32FromBigint(LIGHT_SQUARES_MASK);
const LIGHT_SQUARES_MASK_HI = hi32FromBigint(LIGHT_SQUARES_MASK);
const DARK_SQUARES_MASK_LO = lo32FromBigint(DARK_SQUARES_MASK);
const DARK_SQUARES_MASK_HI = hi32FromBigint(DARK_SQUARES_MASK);

const getPieceLo = (
  position: Position,
  color: ColorType,
  piece: number,
): number => position.stateLo[calculatePieceIndex(color, piece)];

const getPieceHi = (
  position: Position,
  color: ColorType,
  piece: number,
): number => position.stateHi[calculatePieceIndex(color, piece)];

const hasAnyPiece = (lo: number, hi: number): boolean => (lo | hi) !== 0;

const isInsufficientMaterial = (position: Position): boolean => {
  // If any pawns exist, it is not insufficient material
  const whitePawnsLo = getPieceLo(position, COLOR.WHITE, PAWN_INDEX);
  const whitePawnsHi = getPieceHi(position, COLOR.WHITE, PAWN_INDEX);
  const blackPawnsLo = getPieceLo(position, COLOR.BLACK, PAWN_INDEX);
  const blackPawnsHi = getPieceHi(position, COLOR.BLACK, PAWN_INDEX);

  if (
    hasAnyPiece(whitePawnsLo, whitePawnsHi) ||
    hasAnyPiece(blackPawnsLo, blackPawnsHi)
  ) {
    return false;
  }

  // If any rooks are present, return false
  const whiteRooksLo = getPieceLo(position, COLOR.WHITE, ROOK_INDEX);
  const whiteRooksHi = getPieceHi(position, COLOR.WHITE, ROOK_INDEX);
  const blackRooksLo = getPieceLo(position, COLOR.BLACK, ROOK_INDEX);
  const blackRooksHi = getPieceHi(position, COLOR.BLACK, ROOK_INDEX);

  if (
    hasAnyPiece(whiteRooksLo, whiteRooksHi) ||
    hasAnyPiece(blackRooksLo, blackRooksHi)
  ) {
    return false;
  }

  // If any queens are present, return false
  const whiteQueensLo = getPieceLo(position, COLOR.WHITE, QUEEN_INDEX);
  const whiteQueensHi = getPieceHi(position, COLOR.WHITE, QUEEN_INDEX);
  const blackQueensLo = getPieceLo(position, COLOR.BLACK, QUEEN_INDEX);
  const blackQueensHi = getPieceHi(position, COLOR.BLACK, QUEEN_INDEX);

  if (
    hasAnyPiece(whiteQueensLo, whiteQueensHi) ||
    hasAnyPiece(blackQueensLo, blackQueensHi)
  ) {
    return false;
  }

  // Minor pieces (knights & bishops)
  const whiteKnightsLo = getPieceLo(position, COLOR.WHITE, KNIGHT_INDEX);
  const whiteKnightsHi = getPieceHi(position, COLOR.WHITE, KNIGHT_INDEX);
  const blackKnightsLo = getPieceLo(position, COLOR.BLACK, KNIGHT_INDEX);
  const blackKnightsHi = getPieceHi(position, COLOR.BLACK, KNIGHT_INDEX);

  const whiteBishopsLo = getPieceLo(position, COLOR.WHITE, BISHOP_INDEX);
  const whiteBishopsHi = getPieceHi(position, COLOR.WHITE, BISHOP_INDEX);
  const blackBishopsLo = getPieceLo(position, COLOR.BLACK, BISHOP_INDEX);
  const blackBishopsHi = getPieceHi(position, COLOR.BLACK, BISHOP_INDEX);

  const knightsCount =
    countRelevantBits(whiteKnightsLo, whiteKnightsHi) +
    countRelevantBits(blackKnightsLo, blackKnightsHi);
  const bishopsCount =
    countRelevantBits(whiteBishopsLo, whiteBishopsHi) +
    countRelevantBits(blackBishopsLo, blackBishopsHi);

  const minorsCount = knightsCount + bishopsCount;

  // King vs King
  if (minorsCount === 0) {
    return true;
  }

  // King with bishop and knight vs King or vise versa
  if (minorsCount === 1) {
    return true;
  }

  // Theoretically possible to checkmate with for example:
  // King & Knight vs King & Knight
  // So either one side has 2 minor pieces and the other 0 or both sides have 1 minor piece
  // So for now I will treat this as a theoretically possible checkmate => not insufficient material
  if (knightsCount > 0) {
    return false;
  }

  // If there are opposite colored bishops (either B+B+K vs K or B+K vs B+K), mate is theoretically possible
  if (knightsCount === 0) {
    const bishopsLo = (whiteBishopsLo | blackBishopsLo) >>> 0;
    const bishopsHi = (whiteBishopsHi | blackBishopsHi) >>> 0;
    const hasLightSquareBishops =
      ((bishopsLo & LIGHT_SQUARES_MASK_LO) |
        (bishopsHi & LIGHT_SQUARES_MASK_HI)) !==
      0;
    const hasDarkSquareBishops =
      ((bishopsLo & DARK_SQUARES_MASK_LO) |
        (bishopsHi & DARK_SQUARES_MASK_HI)) !==
      0;

    if (hasLightSquareBishops && hasDarkSquareBishops) {
      return false;
    }

    return true;
  }

  return false;
};

export default isInsufficientMaterial;
