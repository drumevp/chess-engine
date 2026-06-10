import generateBishopAttacks from "../../attacks/bishop";
import generateRookAttacks from "../../attacks/rook";
import { FULL_BOARD_MASK } from "../../constants/mask";
import getOppositeColor from "../../helpers/getOppositeColor";
import { squareBitboards } from "../../tables/importTables";
import { encodeMove } from "../../position/moves/packedMove";
import { addMove } from "../moveList";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import { BISHOP_INDEX, PAWN_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../constants/piece";
import { Bitboard } from "../../types/bitboard";
import { MoveGenerationContext } from "../../types/move";
import { COLOR } from "../../constants/color";
import { MOVE_FLAG } from "../../constants/move";

const generateEnPassantMove = (
  ctx: MoveGenerationContext,
  checkMask: Bitboard,
  checkers: Bitboard,
  checkCount: number,
  attackTargets: Bitboard,
  pawnOriginSquare: number,
): void => {
  const originSquareBitboard = squareBitboards[pawnOriginSquare];

  if (ctx.enPassantSquare === null) {
    return;
  }

  const enPassantBitboard = squareBitboards[ctx.enPassantSquare];

  if ((attackTargets & enPassantBitboard) === 0n) {
    return;
  }

  const targetEnPassantPawnSquare =
    ctx.color === COLOR.WHITE
      ? ctx.enPassantSquare - 8
      : ctx.enPassantSquare + 8;
  const targetEnPassantPawnBitboard =
    squareBitboards[targetEnPassantPawnSquare];

  if (checkCount === 1) {
    const isCapturedPawnChecker =
      (checkers & targetEnPassantPawnBitboard) !== 0n;

    const enPassantTargetBlocksSliderCheck =
      (checkMask & enPassantBitboard) !== 0n;

    if (!isCapturedPawnChecker && !enPassantTargetBlocksSliderCheck) {
      return;
    }
  }

  const enemyColor = getOppositeColor(ctx.color);

  // Verify pawn exists
  if (
    ctx.pieceAt[targetEnPassantPawnSquare] !==
    calculatePieceIndex(enemyColor, PAWN_INDEX)
  ) {
    return;
  }

  // Remove the origin pawn, target en pessant pawn and add the new pawn position
  // To generate new occupancy for king legality check
  const occupancyAfterEnPassant =
    (ctx.allOccupancy &
      (FULL_BOARD_MASK ^ originSquareBitboard) &
      (FULL_BOARD_MASK ^ targetEnPassantPawnBitboard)) |
    enPassantBitboard;

  const rookAttacks = generateRookAttacks(
    ctx.ownKingSquare,
    occupancyAfterEnPassant,
  );
  const bishopAttacks = generateBishopAttacks(
    ctx.ownKingSquare,
    occupancyAfterEnPassant,
  );

  const enemyRooks = ctx.state[calculatePieceIndex(enemyColor, ROOK_INDEX)];
  const enemyBishops = ctx.state[calculatePieceIndex(enemyColor, BISHOP_INDEX)];
  const enemyQueens = ctx.state[calculatePieceIndex(enemyColor, QUEEN_INDEX)];

  const rookExposure = (rookAttacks & (enemyRooks | enemyQueens)) === 0n;
  const bishopExposure = (bishopAttacks & (enemyBishops | enemyQueens)) === 0n;
  const isEnPassantMoveLegal = rookExposure && bishopExposure;

  if (!isEnPassantMoveLegal) {
    return;
  }

  addMove(
    ctx.moves,
    encodeMove(
      pawnOriginSquare,
      ctx.enPassantSquare,
      ctx.color,
      PAWN_INDEX,
      MOVE_FLAG.EN_PASSANT,
      PAWN_INDEX,
    ),
  );
};

export default generateEnPassantMove;
