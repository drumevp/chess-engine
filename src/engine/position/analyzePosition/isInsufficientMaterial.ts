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
import countRelevantBits from "../../helpers/countRelevantBits";
import { Position } from "../../types/position";

const isInsufficientMaterial = (position: Position): boolean => {
  // If any pawns exist, it is not insufficient material
  const whitePawns =
    position.state[calculatePieceIndex(COLOR.WHITE, PAWN_INDEX)];
  const blackPawns =
    position.state[calculatePieceIndex(COLOR.BLACK, PAWN_INDEX)];

  if (whitePawns !== 0n || blackPawns !== 0n) {
    return false;
  }

  // If any rooks are present, return false
  const whiteRooks =
    position.state[calculatePieceIndex(COLOR.WHITE, ROOK_INDEX)];
  const blackRooks =
    position.state[calculatePieceIndex(COLOR.BLACK, ROOK_INDEX)];

  if (whiteRooks !== 0n || blackRooks !== 0n) {
    return false;
  }

  // If any queens are present, return false
  const whiteQueens =
    position.state[calculatePieceIndex(COLOR.WHITE, QUEEN_INDEX)];
  const blackQueens =
    position.state[calculatePieceIndex(COLOR.BLACK, QUEEN_INDEX)];

  if (whiteQueens !== 0n || blackQueens !== 0n) {
    return false;
  }

  // Minor pieces (knights & bishops)
  const whiteKnights =
    position.state[calculatePieceIndex(COLOR.WHITE, KNIGHT_INDEX)];
  const blackKnights =
    position.state[calculatePieceIndex(COLOR.BLACK, KNIGHT_INDEX)];

  const whiteBishops =
    position.state[calculatePieceIndex(COLOR.WHITE, BISHOP_INDEX)];
  const blackBishops =
    position.state[calculatePieceIndex(COLOR.BLACK, BISHOP_INDEX)];

  const knightsCount =
    countRelevantBits(whiteKnights) + countRelevantBits(blackKnights);
  const bishopsCount =
    countRelevantBits(whiteBishops) + countRelevantBits(blackBishops);

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
    const bishops = whiteBishops | blackBishops;
    const hasLightSquareBishops = (bishops & LIGHT_SQUARES_MASK) !== 0n;
    const hasDarkSquareBishops = (bishops & DARK_SQUARES_MASK) !== 0n;

    if (hasLightSquareBishops && hasDarkSquareBishops) {
      return false;
    }

    return true;
  }

  return false;
};

export default isInsufficientMaterial;
