/**
 * FEN STRING LAYOUT
 * 1) 8 ranks info divided by "/"
 * 2) w or b -> whose turn it is
 * 3) KQkq -> castling rights. if no queenside castling is allowed, a letter is removed. if nobdy can castle, it turns into -
 * 4) en passant square -> "-" is null. if there is one it will be e4 or d5 or whatever. gotta conver that to a square
 * 5) halfmove clock
 * 6) fullmove number (starting from 1)
 *
 * EX: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
 * If the knight from b1 moves to c3, the FEN string looks like this
 * rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1
 *
 */
import { squareBitboards } from "../../lookupTables/importedPrecalculatedData";
import buildPieceAtArray from "../../state/buildPieceAtArray";
import getOccupiedPiecesBitboard from "../../state/getPiecesOccupied";
import {
  calculatePieceIndex,
  KING_INDEX,
  PAWN_INDEX,
  ROOK_INDEX,
} from "../../state/initialState";
import { COLOR, type Position } from "../../types/main";
import {
  FEN_COLOR_TO_INTERNAL_COLOR,
  FEN_PIECE_TO_INTERNAL_PIECE,
  FEN_RANK_TO_INTERNAL_RANK,
} from "./constants";
import parseFenCastling from "./helpers/parseFenCastling";
import parseFenEnPassantSquare from "./helpers/parseFenEnPassantSquare";

const generatePositionToFen = (fen: string): Position => {
  // Init state array
  const state = new Array<bigint>(12).fill(0n);

  // Split string into base sections
  // We trim and split on /\s+/ -> 1 or more white spaces
  const fenSplit = fen.trim().split(/\s+/);

  if (fenSplit.length !== 6) {
    throw new Error("Invalid FEN string");
  }

  const [fenPosition, sideToMove, castling, enPassant, halfmove, fullmove] =
    fenSplit;

  const fenRanks = fenPosition.split("/");

  if (fenRanks.length !== 8) {
    throw new Error("Invalid FEN string rank length");
  }

  fenRanks.forEach((fenRank, fenRankIndex) => {
    const rank = FEN_RANK_TO_INTERNAL_RANK[fenRankIndex];

    // Validation for number of files within the rank
    // We sum up all the numbers (empty squares) and add 1 for each valid piece on a square
    // If the sum is not exactly 8, the string is invalid
    // We also continue the loop if we meet a number so the logic below only handles pieces
    let file = 0;

    for (const char of fenRank) {
      if (char >= "1" && char <= "8") {
        file += Number(char);

        if (file > 8) {
          throw new Error("Invalid FEN string");
        }

        continue;
      }

      const piece = FEN_PIECE_TO_INTERNAL_PIECE[char];

      if (piece === undefined) {
        throw new Error("Invalid FEN piece");
      }

      const statePieceIndex = calculatePieceIndex(
        piece.color,
        piece.pieceIndex,
      );
      const pieceSquare = rank * 8 + file;
      const pieceSquareBit = squareBitboards[pieceSquare];

      // In case it is outside the 0-63 range
      if (pieceSquareBit === undefined) {
        throw new Error("Invalid FEN string");
      }

      state[statePieceIndex] |= pieceSquareBit;

      file += 1;
    }

    if (file !== 8) {
      throw new Error("FEN string rank doesnt not contain 8 files exactly");
    }
  });

  const pieceAt = buildPieceAtArray(state);
  const whiteKingSquare = pieceAt.findIndex((value) => value === KING_INDEX);
  const blackKingSquare = pieceAt.findIndex(
    (value) => value === calculatePieceIndex(COLOR.BLACK, KING_INDEX),
  );

  if (whiteKingSquare === -1 || blackKingSquare === -1) {
    throw new Error("Invalid king position");
  }

  const kingSquares = new Int8Array([whiteKingSquare, blackKingSquare]);

  const allOccupancy = getOccupiedPiecesBitboard(state);
  const whiteOccupancy = getOccupiedPiecesBitboard(
    state.slice(ROOK_INDEX, PAWN_INDEX + 1),
  );
  const blackOccupancy = getOccupiedPiecesBitboard(
    state.slice(
      calculatePieceIndex(COLOR.BLACK, ROOK_INDEX),
      calculatePieceIndex(COLOR.BLACK, PAWN_INDEX) + 1,
    ),
  );

  const halfMoveClock = Number(halfmove);

  if (
    halfMoveClock === undefined ||
    Number.isNaN(halfMoveClock) ||
    !Number.isInteger(halfMoveClock) ||
    halfMoveClock < 0
  ) {
    throw new Error("Invalid FEN half move clock");
  }

  const fullMoveNumber = Number(fullmove);

  if (
    fullMoveNumber === undefined ||
    Number.isNaN(fullMoveNumber) ||
    !Number.isInteger(fullMoveNumber) ||
    fullMoveNumber < 1
  ) {
    throw new Error("Invalid FEN full move number");
  }

  const enPassantSquare = parseFenEnPassantSquare(enPassant);
  const color = FEN_COLOR_TO_INTERNAL_COLOR[sideToMove];

  if (color === undefined) {
    throw new Error("Invalid FEN side to move");
  }

  const castlingRights = parseFenCastling(castling);

  return {
    state,
    allOccupancy,
    blackOccupancy,
    castlingRights,
    color,
    enPassantSquare,
    fullMoveNumber,
    halfMoveClock,
    kingSquares,
    pieceAt,
    whiteOccupancy,
  };
};

export default generatePositionToFen;
