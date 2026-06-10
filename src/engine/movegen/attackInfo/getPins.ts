/**
 * To generate pinners, we first look at pinner candidates.
 * We take the king position and generate rays for slider pieces (rooks, bishops) - inherently includes the queens
 * We check if there are enemy bishops, rooks or queens along those rays.
 * 
 * Then to check if there is a pin, we must know how many pieces are between the king and the sliding piece.
 * This could be on a RANK, FILE or DIAGONAL.
 * Generating the 'between' bitboard, we AND it to the allOccupancy bitboard -> this gives us how many blockers are present along this ray
 * 
 * IF there are no blockers, the king is directly in check. This is handled by the checkers bitboard.
 * If there are two or more blockers, there are no pinned pieces.
 * If there is exactly one blocker, we must check if it is our piece by comparing it to ownOccupancy.
 */

import generateBishopAttacks from "../../attacks/bishop";
import generateRookAttacks from "../../attacks/rook";
import { BISHOP_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../constants/piece";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import forEachBitGetSquare from "../../helpers/forEachBitGetSquare";
import getOppositeColor from "../../helpers/getOppositeColor";
import hasExactlyOneBit from "../../helpers/hasExactlyOneBit";
import { betweenSquares, squareBitboards, squareIndexByBitboard } from "../../tables/importTables";
import { Bitboard } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";

const getPins = (ctx: MoveGenerationContext): {pinnedPieces: Bitboard, pinRaysBySquare: Bitboard[]}  => {
  let pinnedPieces: Bitboard = 0n;
  const pinRaysBySquare: Bitboard[] = new Array(64).fill(0n);

  // Get slider candidates
  const enemyColor = getOppositeColor(ctx.color);
  const enemyRooks = ctx.state[calculatePieceIndex(enemyColor, ROOK_INDEX)];
  const enemyBishops = ctx.state[calculatePieceIndex(enemyColor, BISHOP_INDEX)];
  const enemyQueens = ctx.state[calculatePieceIndex(enemyColor, QUEEN_INDEX)];

  const rookPinnerCandidates = generateRookAttacks(ctx.ownKingSquare, 0n) & (enemyRooks | enemyQueens);
  const bishopPinnerCandidates = generateBishopAttacks(ctx.ownKingSquare, 0n) & (enemyBishops | enemyQueens);
  const pinnerCandidates = rookPinnerCandidates | bishopPinnerCandidates;

  if (pinnerCandidates === 0n) {
    return {
      pinnedPieces,
      pinRaysBySquare,
    }
  }

  forEachBitGetSquare(pinnerCandidates, (pinnerCandidateSquare) => {
    const betweenBitboard = betweenSquares[ctx.ownKingSquare][pinnerCandidateSquare];
    const blockersBetween = betweenBitboard & ctx.allOccupancy;

    if (!hasExactlyOneBit(blockersBetween)) {
      return;
    }

    const pinnedSquareBitboard = blockersBetween & ctx.ownOccupancy;

    if (pinnedSquareBitboard === 0n) {
      return;
    }

    pinnedPieces = pinnedPieces | pinnedSquareBitboard;
    const ownBlockerSquare = squareIndexByBitboard.get(pinnedSquareBitboard);

    if (ownBlockerSquare === undefined) {
      throw new Error('Invalid blocker square');
    }

    const pinnerSquareBitboard = squareBitboards[pinnerCandidateSquare];
    pinRaysBySquare[ownBlockerSquare] = betweenBitboard | pinnerSquareBitboard;
  });


  return {
    pinnedPieces,
    pinRaysBySquare,
  }
}

export default getPins;