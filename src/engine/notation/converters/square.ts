import { INTERNAL_FILE_TO_STANDARD_NOTATION_FILE, STANDARD_NOTATION_FILE_TO_INTERNAL_FILE, VALID_STANDARD_NOTATION_FILES } from "../../constants/notation";
import { getCurrentFile, getCurrentIndex, getCurrentRank } from "../../helpers/main";

const internalSquareToStandardNotationSquare = (square: number): string => {
  const file = getCurrentFile(square);
  const rank = getCurrentRank(square);

  const standardNotationFile = INTERNAL_FILE_TO_STANDARD_NOTATION_FILE[file];

  return standardNotationFile + (rank + 1).toString();
}

const standardNotationSquareToInternalSquare = (square: string): number => {
  if (square.length !== 2) {
    throw new Error('Invalid square notation');
  }

  const [file, rankString] = square;

  const rank = Number(rankString);

  if (Number.isNaN(rank)) {
    throw new Error('Invalid square rank');
  }

  if (rank < 1 || rank > 8) {
    throw new Error('Invalid square rank');
  }

  if (!VALID_STANDARD_NOTATION_FILES.includes(file)) {
    throw new Error('Invalid square file');
  }

  const internalFile = STANDARD_NOTATION_FILE_TO_INTERNAL_FILE[file];
  const internalRank = rank - 1;

  return getCurrentIndex(internalRank, internalFile);
}

export { internalSquareToStandardNotationSquare, standardNotationSquareToInternalSquare };
