/**
 * Parses a square like e5 or c7 into an internal index for a square 0->63
 *
 * To convert the string "a" to a number 0, we take the string, for example "b".charCodeAt(0). this should give is 98 I believe.
 * If we substract "a".charCodeAt(0), we get 1. so b ==== file1. a === file0
 */

const parseFenFieldToSquare = (field: string): number => {
  if (field.length !== 2) {
    throw new Error("Invalid FEN field");
  }

  const file = field.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(field[1]) - 1; // Since internally I index from 0 and not 1

  if (Number.isNaN(rank)) {
    throw new Error("Invalid FEN field");
  }

  // If file or rank isn't within the 0-7 range, throw.
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    throw new Error("Invalid FEN field");
  }

  return rank * 8 + file;
};

export default parseFenFieldToSquare;
