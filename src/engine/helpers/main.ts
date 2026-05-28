export const getCurrentFile = (position: number): number => {
  return position % 8;
}

export const getCurrentRank = (position: number): number => {
  return Math.floor(position / 8);
}

export const getCurrentIndex = (rank: number, file: number): number => {
  return rank * 8 + file;
}