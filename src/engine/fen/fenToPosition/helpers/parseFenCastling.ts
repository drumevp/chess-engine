import { CASTLING_RIGHTS } from "../../../constants/castling";


const parseFenCastling = (castling: string): number => {
  if (castling === "-") {
    return 0;
  }

  if (castling.length === 0) {
    throw new Error("Invalid FEN castling");
  }

  // In case the string contains a repeat letter for castling
  // If we see the same letter twice, we throw
  const seen = new Set<string>();
  let castlingRights = 0;

  for (const char of castling) {
    if (seen.has(char)) {
      throw new Error("Duplicate FEN castling character");
    }

    seen.add(char);

    switch (char) {
      case "K":
        castlingRights |= CASTLING_RIGHTS.WHITE_KINGSIDE;
        break;
      case "Q":
        castlingRights |= CASTLING_RIGHTS.WHITE_QUEENSIDE;
        break;
      case "k":
        castlingRights |= CASTLING_RIGHTS.BLACK_KINGSIDE;
        break;
      case "q":
        castlingRights |= CASTLING_RIGHTS.BLACK_QUEENSIDE;
        break;
      default:
        throw new Error("Invalid FEN castling character");
    }
  }

  return castlingRights;
};

export default parseFenCastling;
