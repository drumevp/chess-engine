/**
 * Main chessboard component.
 * 
 * This should handle the displaying the current state of the board.
 * The relationship between the parent chess board component and the child Square component is the following:
 * 
 * Board component computes whether a specific square is:
 * 1) selected
 * 2) legal quiet move
 * 3) legal capture move
 * 4) previous move highlight
 * 5) in check (king only ofc)
 * 6) handles onClick(squareIndex) from Square component
 * 
 * On a higher level, we need to handle:
 * 1) history (fen string, move, chess notation string, pieceAt state array).
 *    This is because we want to allow chess.com-like behaviour, where
 *    a player can click on a previous point in the game and branch out by testing out moves.
 *    We can instantiate a snapshot chess engine so they can play that position (without affecting
 *    the main thread position).
 * 2) Game state - obtainable from chess engine I believe - (current side, turn, pieceAt array, isCheck, isCheckmate, isStalemate) TODO: think of more
 * 3) Legal moves - pass an array of legal moves for the current position.
 */

import { COLOR } from '../constants/main';
import getBoardSquareOrder from '../helpers/getBoardSquareOrder';
import './ChessBoard.css';
import Square from './Square';

type ChessBoardProps = {
  pieceAt: Int8Array;
}

const ChessBoard: React.FC<ChessBoardProps> = ({pieceAt}) => {
  const boardSquareOrder = getBoardSquareOrder(COLOR.WHITE);

  return (
    <div className="chess-board">
      {boardSquareOrder.map((boardIndex) => {
        const pieceIndex = pieceAt[boardIndex];

        return (
          <Square key={`square-${boardIndex}`} pieceIndex={pieceIndex} boardIndex={boardIndex}/>
        )
      })}
    </div>
  )
}

export default ChessBoard;