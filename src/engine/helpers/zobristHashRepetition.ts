export const incrementRepetition = (
  repetitionCounts: Map<bigint, number>,
  hash: bigint,
): void => {
  const currentHashCount = repetitionCounts.get(hash) ?? 0;
  repetitionCounts.set(hash, currentHashCount + 1);
};

export const decrementRepetition = (
  repetitionCounts: Map<bigint, number>,
  hash: bigint,
): void => {
  const previousHashCount = repetitionCounts.get(hash) ?? 0;

  if (previousHashCount <= 1) {
    repetitionCounts.delete(hash);
  } else {
    repetitionCounts.set(hash, previousHashCount - 1);
  }
};
