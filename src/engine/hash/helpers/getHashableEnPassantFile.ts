import { COLOR } from "../../constants/color";
import { PAWN_INDEX } from "../../constants/piece";
import calculatePieceIndex from "../../helpers/calculatePieceIndex";
import getOppositeColor from "../../helpers/getOppositeColor";
import { getCurrentFile } from "../../helpers/main";
import { Position } from "../../types/position";
import isLegalEnPassantForHash from "./isLegalEnPassantForHash";

const getHashableEnPassantFile = (position: Position): number | null => {
  if (position.enPassantSquare === null) {
    return null;
  }

  const enPassantFile = getCurrentFile(position.enPassantSquare);

  const enemyColor = getOppositeColor(position.color);
  const ownPawnStateIndex = calculatePieceIndex(position.color, PAWN_INDEX);
  const enemyPawnStateIndex = calculatePieceIndex(enemyColor, PAWN_INDEX);

  const capturedPawnSquare =
    position.color === COLOR.WHITE
      ? position.enPassantSquare - 8
      : position.enPassantSquare + 8;

  if (position.pieceAt[capturedPawnSquare] !== enemyPawnStateIndex) {
    return null;
  }

  const enPassantCandidatePawnSquares: number[] = [];

  if (position.color === COLOR.WHITE) {
    // Bottom left candudate
    // We ignore adding a bottom left pawn on file 0, as there is no such pawn.
    // It would reuslt in a rank 7 target, which is incorrect
    if (enPassantFile > 0) {
      enPassantCandidatePawnSquares.push(position.enPassantSquare - 9);
    }

    // Bottom right candidate
    // We ignore adding a bottom right pawn on file 7 for the same reasons as above
    if (enPassantFile < 7) {
      enPassantCandidatePawnSquares.push(position.enPassantSquare - 7);
    }
  } else {
    // Top left
    if (enPassantFile > 0) {
      enPassantCandidatePawnSquares.push(position.enPassantSquare + 9);
    }

    // Top right
    if (enPassantFile < 7) {
      enPassantCandidatePawnSquares.push(position.enPassantSquare + 7);
    }
  }

  for (let i = 0; i < enPassantCandidatePawnSquares.length; i++) {
    const candidateSquare = enPassantCandidatePawnSquares[i];
    const isCandidateReal =
      position.pieceAt[candidateSquare] === ownPawnStateIndex;

    if (!isCandidateReal) {
      continue;
    }

    const isLegal = isLegalEnPassantForHash(
      position,
      candidateSquare,
      position.enPassantSquare,
      capturedPawnSquare,
      enemyColor,
    );

    if (isLegal) {
      return enPassantFile;
    }
  }

  return null;
};

export default getHashableEnPassantFile;
