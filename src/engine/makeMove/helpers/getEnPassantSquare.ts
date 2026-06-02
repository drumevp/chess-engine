import type { Move } from "../../types/main";

const getEnPassantSquare = (move: Move) => {
  return (move.from + move.to) / 2;
};

export default getEnPassantSquare;
