import generateBishopAttacks from "../../attacks/bishop";
import generateRookAttacks from "../../attacks/rook";
import { FULL_BOARD_MASK } from "../../constants/mask";
import getOppositeColor from "../../helpers/getOppositeColor";
import { squareBitboards } from "../../lookupTables/importedPrecalculatedData";
import { BISHOP_INDEX, calculatePieceIndex, PAWN_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../state/initialState";
import { COLOR, MOVE_FLAG, type Move } from "../../types/main";
import type { MoveGenerationContext } from "../types";

const generateEnPessantMove = (ctx: MoveGenerationContext, checkMask: bigint, checkers: bigint, checkCount: number, attackTargets: bigint, pawnOriginSquare: number): Move | null => {
  const originSquareBitboard = squareBitboards[pawnOriginSquare];
  
  if (ctx.enPassantSquare === null) {
    return null;
  }

  const enPessantBitboard = squareBitboards[ctx.enPassantSquare];
  
  if ((attackTargets & enPessantBitboard) === 0n) {
    return null;
  }

  const targetEnPessantPawnSquare = ctx.color === COLOR.WHITE ? ctx.enPassantSquare - 8 : ctx.enPassantSquare + 8;
  const targetEnPessantPawnBitboard = squareBitboards[targetEnPessantPawnSquare];

  if (checkCount === 1) {
    const isCapturedPawnChecker = (checkers & targetEnPessantPawnBitboard) !== 0n;

    const enPessantTargetBlocksSliderCheck = (checkMask & enPessantBitboard) !== 0n;

    if (!isCapturedPawnChecker && !enPessantTargetBlocksSliderCheck) {
      return null;
    }
  }

  
  const enemyColor = getOppositeColor(ctx.color);

  // Verify pawn exists
  if (ctx.pieceAt[targetEnPessantPawnSquare] !== calculatePieceIndex(enemyColor, PAWN_INDEX)) {
    return null;
  }

  // Remove the origin pawn, target en pessant pawn and add the new pawn position
  // To generate new occupancy for king legality check
  const occupancyAfterEnPessant = (ctx.allOccupancy
  & (FULL_BOARD_MASK ^ originSquareBitboard)
  & (FULL_BOARD_MASK ^ targetEnPessantPawnBitboard))
  | enPessantBitboard;
  
  const rookAttacks = generateRookAttacks(ctx.ownKingSquare, occupancyAfterEnPessant);
  const bishopAttacks = generateBishopAttacks(ctx.ownKingSquare, occupancyAfterEnPessant);
  
  const enemyRooks = ctx.state[(calculatePieceIndex(enemyColor, ROOK_INDEX))];
  const enemyBishops = ctx.state[(calculatePieceIndex(enemyColor, BISHOP_INDEX))];
  const enemyQueens = ctx.state[(calculatePieceIndex(enemyColor, QUEEN_INDEX))];

  const rookExposure = (rookAttacks & (enemyRooks | enemyQueens)) === 0n;
  const bishopExposure = (bishopAttacks & (enemyBishops | enemyQueens)) === 0n;
  const isEnPessantMoveLegal = rookExposure && bishopExposure;

  if (!isEnPessantMoveLegal) {
    return null;
  }


  return {
    color: ctx.color,
    flag: MOVE_FLAG.EN_PASSANT,
    from: pawnOriginSquare,
    to: ctx.enPassantSquare,
    piece: PAWN_INDEX,
    capturedPiece: PAWN_INDEX,
  }
}

export default generateEnPessantMove;