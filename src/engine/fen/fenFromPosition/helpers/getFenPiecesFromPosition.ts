import { INTERNAL_PIECE_TO_FEN_PIECE } from "../../../constants/fen";
import { getCurrentIndex } from "../../../helpers/main";
import { Position } from "../../../types/position";

const getFenPiecesFromPosition = (position: Position): string => {
  let boardStateFen = '';

  for(let rank = 7; rank >= 0; rank--) {
    let currentRankString = '';
    let emptySquaresCount = 0;

    for(let file = 0; file <= 7; file++) {
      const squareIndex = getCurrentIndex(rank, file);
      const pieceAtSquare = position.pieceAt[squareIndex];

      if (pieceAtSquare === -1) {
        emptySquaresCount++;
      } else {
        if (emptySquaresCount > 0) {
          currentRankString = currentRankString + emptySquaresCount.toString();
          emptySquaresCount = 0;
        }
        currentRankString = currentRankString + INTERNAL_PIECE_TO_FEN_PIECE[pieceAtSquare];
      }
    }

    if (emptySquaresCount > 0) {
      currentRankString = currentRankString + emptySquaresCount.toString();
    }

    boardStateFen = boardStateFen + currentRankString;

    if (rank !== 0) {
      boardStateFen = boardStateFen + '/';
    }
  }

  return boardStateFen;
}

export default getFenPiecesFromPosition;