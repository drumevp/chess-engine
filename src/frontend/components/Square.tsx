/**
 * TODO: Handle displaying board coordinates. - This most likely requires the orientation to calculate properly
 */

import { PIECE_STATE_INDEX_TO_BOARD_ITEM } from '../constants/main';
import './Square.css';

type SquareProps = {
  pieceIndex: number;
  boardIndex: number;
}

const Square: React.FC<SquareProps> = ({pieceIndex, boardIndex}) => {
  const rank = Math.floor(boardIndex / 8);
  const file =  boardIndex % 8;
  const color = (rank + file) % 2;

  const isWhite = color === 1;
  const colorClass = isWhite ? 'white' : 'black';

  const pieceToDisplay = pieceIndex === -1 ? null : PIECE_STATE_INDEX_TO_BOARD_ITEM[pieceIndex];
  const pieceColor = pieceIndex === -1 ? null : pieceIndex <=5 ? 'white' : 'black';


  return (
    <div className={`square ${colorClass}`}>
      {pieceToDisplay ? (
        <div className={`piece ${pieceColor}`}>
        {pieceToDisplay}
      </div>
      ) : null}
    </div>
  )
}

export default Square;