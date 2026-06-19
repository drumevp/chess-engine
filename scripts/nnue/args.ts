export const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);

  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }

  return process.argv[index + 1];
};

export const hasArg = (name: string): boolean => process.argv.includes(name);

export const getNumberArg = (name: string, fallback: number): number => {
  const value = Number(getArg(name, String(fallback)));

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid number for ${name}`);
  }

  return value;
};
