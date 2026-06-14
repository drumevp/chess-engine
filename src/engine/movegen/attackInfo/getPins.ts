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
import getSingleBitSquare from "../../helpers/getSingleBitSquare";
import hasExactlyOneBit from "../../helpers/hasExactlyOneBit";
import {
  betweenSquaresHi,
  betweenSquaresLo,
  squareBitboardsHi,
  squareBitboardsLo,
} from "../../tables/importTables";
import { AttackInfo } from "../../types/attackInfo";
import { MoveGenerationContext } from "../../types/move";

const rookAttackScratch = { lo: 0, hi: 0 };
const bishopAttackScratch = { lo: 0, hi: 0 };

const getPins = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  // Get slider candidates
  const enemyColor = getOppositeColor(ctx.color);

  const rookIndex = calculatePieceIndex(enemyColor, ROOK_INDEX);
  const bishopIndex = calculatePieceIndex(enemyColor, BISHOP_INDEX);
  const queenIndex = calculatePieceIndex(enemyColor, QUEEN_INDEX);

  const enemyRooksLo = ctx.stateLo[rookIndex];
  const enemyRooksHi = ctx.stateHi[rookIndex];

  const enemyBishopsLo = ctx.stateLo[bishopIndex];
  const enemyBishopsHi = ctx.stateHi[bishopIndex];

  const enemyQueensLo = ctx.stateLo[queenIndex];
  const enemyQueensHi = ctx.stateHi[queenIndex];

  generateRookAttacks(ctx.ownKingSquare, 0, 0, rookAttackScratch);

  const rookPinnerCandidatesLo =
    rookAttackScratch.lo & (enemyRooksLo | enemyQueensLo);
  const rookPinnerCandidatesHi =
    rookAttackScratch.hi & (enemyRooksHi | enemyQueensHi);

  generateBishopAttacks(ctx.ownKingSquare, 0, 0, bishopAttackScratch);

  const bishopPinnerCandidatesLo =
    bishopAttackScratch.lo & (enemyBishopsLo | enemyQueensLo);
  const bishopPinnerCandidatesHi =
    bishopAttackScratch.hi & (enemyBishopsHi | enemyQueensHi);

  const pinnerCandidatesLo = rookPinnerCandidatesLo | bishopPinnerCandidatesLo;
  const pinnerCandidatesHi = rookPinnerCandidatesHi | bishopPinnerCandidatesHi;

  if (pinnerCandidatesLo === 0 && pinnerCandidatesHi === 0) {
    return;
  }

  forEachBitGetSquare(
    pinnerCandidatesLo,
    pinnerCandidatesHi,
    (pinnerCandidateSquare) => {
      const betweenIndex = ctx.ownKingSquare * 64 + pinnerCandidateSquare;

      const betweenLo = betweenSquaresLo[betweenIndex];
      const betweenHi = betweenSquaresHi[betweenIndex];

      const blockersBetweenLo = betweenLo & ctx.allOccupancyLo;
      const blockersBetweenHi = betweenHi & ctx.allOccupancyHi;

      if ((blockersBetweenLo | blockersBetweenHi) === 0) {
        attackInfo.checkersLo =
          (attackInfo.checkersLo | squareBitboardsLo[pinnerCandidateSquare]) >>>
          0;
        attackInfo.checkersHi =
          (attackInfo.checkersHi | squareBitboardsHi[pinnerCandidateSquare]) >>>
          0;
        return;
      }

      if (!hasExactlyOneBit(blockersBetweenLo, blockersBetweenHi)) {
        return;
      }

      const pinnedSquareLo = blockersBetweenLo & ctx.ownOccupancyLo;
      const pinnedSquareHi = blockersBetweenHi & ctx.ownOccupancyHi;

      if ((pinnedSquareLo | pinnedSquareHi) === 0) {
        return;
      }

      attackInfo.pinnedPiecesLo =
        (attackInfo.pinnedPiecesLo | pinnedSquareLo) >>> 0;
      attackInfo.pinnedPiecesHi =
        (attackInfo.pinnedPiecesHi | pinnedSquareHi) >>> 0;

      const pinnedSquare = getSingleBitSquare(pinnedSquareLo, pinnedSquareHi);

      attackInfo.pinRaysBySquareLo[pinnedSquare] =
        (betweenLo | squareBitboardsLo[pinnerCandidateSquare]) >>> 0;
      attackInfo.pinRaysBySquareHi[pinnedSquare] =
        (betweenHi | squareBitboardsHi[pinnerCandidateSquare]) >>> 0;
    },
  );
};

export default getPins;
