/**
 * To calculate the zobrist hash for the position, we use the precalculated tables with
 * random 64 bit values. For each piece of information we are hashing we perform an XOR (^) operation
 */

import { COLOR } from "../constants/color";
import { zobristBlackToMoveKey } from "../tables/generated/zobristBlackToMoveKey";
import { zobristCastlingMaskKeys } from "../tables/generated/zobristCastlingMaskKeys";
import { zobristEnPassantFileKeys } from "../tables/generated/zobristEnPassantFileKeys";
import { zobristPieceSquareKeys } from "../tables/generated/zobristPieceSquareKeys";
import { Position } from "../types/position";
import getHashableEnPassantFile from "./helpers/getHashableEnPassantFile";

const hashPosition = (position: Position): bigint => {
  let hash: bigint = 0n;

  for (let square = 0; square < 64; square++) {
    const pieceStateIndex = position.pieceAt[square];

    if (pieceStateIndex === -1) {
      continue;
    }

    hash ^= zobristPieceSquareKeys[pieceStateIndex][square];
  }

  if (position.color === COLOR.BLACK) {
    hash ^= zobristBlackToMoveKey;
  }

  hash ^= zobristCastlingMaskKeys[position.castlingRights];

  /**
   * We only hash the en passant file if there is a
   * 1) en passant square
   * 2) en passant is a legal move
   *    - there is a pawn that can perform en passant
   *.   - the king is safe after potential en passant
   */
  const enPassantFile = getHashableEnPassantFile(position);

  if (enPassantFile !== null) {
    hash ^= zobristEnPassantFileKeys[enPassantFile];
  }

  return hash;
};

export default hashPosition;
