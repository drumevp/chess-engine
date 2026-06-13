const getOccupiedPiecesBitboard = (
  stateLo: Uint32Array,
  stateHi: Uint32Array,
  start = 0,
  end = stateLo.length,
): { occupancyLo: number; occupancyHi: number } => {
  let occupancyLo: number = 0;
  let occupancyHi: number = 0;

  for (let i = start; i < end; i++) {
    occupancyLo |= stateLo[i];
    occupancyHi |= stateHi[i];
  }

  return {
    occupancyLo,
    occupancyHi,
  };
};

export default getOccupiedPiecesBitboard;
