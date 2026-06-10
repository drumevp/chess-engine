import generateBlackPawnAttacks from "../attacks/blackPawn";
import generateWhitePawnAttacks from "../attacks/whitePawn";
import forEachBitGetSquare from "./forEachBitGetSquare";
import generateKnightAttacks from "../attacks/knight";
import generateKingAttacks from "../attacks/king";
import generateRookAttacks from "../attacks/rook";
import generateBishopAttacks from "../attacks/bishop";
import generateQueenAttacks from "../attacks/queen";
import { Bitboard } from "../types/bitboard";
import { ColorType } from "../types/color";
import calculatePieceIndex from "./calculatePieceIndex";
import { BISHOP_INDEX, KING_INDEX, KNIGHT_INDEX, PAWN_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../constants/piece";
import { COLOR } from "../constants/color";

const getAllAttacksForColor = (color: ColorType, state: Bitboard[], allOccupancy: Bitboard):Bitboard => {
  let pawnAttackFn = color === COLOR.WHITE ? generateWhitePawnAttacks : generateBlackPawnAttacks;

  let allPawnAttacks: bigint = 0n;
  forEachBitGetSquare(state[calculatePieceIndex(color, PAWN_INDEX)], (square) => {
    allPawnAttacks = allPawnAttacks | pawnAttackFn(square, allOccupancy);
  });

  let allKnightAttacks: bigint = 0n;
  forEachBitGetSquare(state[calculatePieceIndex(color, KNIGHT_INDEX)], (square) => {
    allKnightAttacks = allKnightAttacks | generateKnightAttacks(square, allOccupancy);
  });

  let allKingAttacks: bigint = 0n;
  forEachBitGetSquare(state[calculatePieceIndex(color, KING_INDEX)], (square) => {
    allKingAttacks = allKingAttacks | generateKingAttacks(square, allOccupancy);
  });

  let allRookAttacks: bigint = 0n;
  forEachBitGetSquare(state[calculatePieceIndex(color, ROOK_INDEX)], (square) => {
    allRookAttacks = allRookAttacks | generateRookAttacks(square, allOccupancy);
  });
  
  let allBishopAttacks: bigint = 0n;
  forEachBitGetSquare(state[calculatePieceIndex(color, BISHOP_INDEX)], (square) => {
    allBishopAttacks = allBishopAttacks | generateBishopAttacks(square, allOccupancy);
  });

  let allQueenAttacks: bigint = 0n;
  forEachBitGetSquare(state[calculatePieceIndex(color, QUEEN_INDEX)], (square) => {
    allQueenAttacks = allQueenAttacks | generateQueenAttacks(square, allOccupancy);
  });

  return allPawnAttacks | allKnightAttacks | allKingAttacks | allRookAttacks | allBishopAttacks | allQueenAttacks;
}

export default getAllAttacksForColor;