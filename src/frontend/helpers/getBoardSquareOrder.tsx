// Order board elements
// rank 0 must be from index 56 - index 63 (a1 -> h1)
// currently rank 0 is from index 0 - index 7

import { COLOR } from "../constants/main";

const getBoardSquareOrder = (orientation: string): number[] => {
  const squareOrder: number[] = [];

  // FOR WHITE: Bottom right is a1, top right is h8
  if (orientation === COLOR.WHITE) {
    for(let rank = 7; rank >= 0; rank--) {
      for(let file = 0; file < 8; file++) {
        squareOrder.push(rank * 8 + file);
      }
    }
  
  // FOR BLACK: Bottom right is h8, top right is a1 
  } else {
    for(let rank = 0; rank < 8; rank++) {
      for(let file = 7; file >= 0; file--) {
        squareOrder.push(rank * 8 + file);
      }
    }
  }

  return squareOrder;
}

export default getBoardSquareOrder;