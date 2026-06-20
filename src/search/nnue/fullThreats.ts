import { COLOR } from "../../engine/constants/color";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";
import generateBishopAttacks from "../../engine/attacks/bishop";
import generateBlackPawnAttacks from "../../engine/attacks/blackPawn";
import generateKingAttacks from "../../engine/attacks/king";
import generateKnightAttacks from "../../engine/attacks/knight";
import generateQueenAttacks from "../../engine/attacks/queen";
import generateRookAttacks from "../../engine/attacks/rook";
import generateWhitePawnAttacks from "../../engine/attacks/whitePawn";
import calculatePieceIndex from "../../engine/helpers/calculatePieceIndex";
import forEachBitGetSquare from "../../engine/helpers/forEachBitGetSquare";
import getPieceTypeFromStateIndex from "../../engine/helpers/getPieceTypeFromStateIndex";
import type { Bitboard32 } from "../../engine/types/bitboard";
import type { ColorType } from "../../engine/types/color";
import type { Position } from "../../engine/types/position";
import {
  NNUE_FULL_THREAT_ALL_FEATURE_PIECES,
  NNUE_FULL_THREAT_FEATURE_PIECE_COUNT,
  NNUE_FULL_THREAT_NUM_VALID_TARGETS,
  NNUE_FULL_THREAT_ORIENT_TABLE,
  NNUE_FULL_THREAT_SENTINEL,
  NNUE_FULL_THREAT_TARGET_MAP,
  getNnueFullThreatFeaturePiece,
  getNnueFullThreatFeaturePieceColor,
  getNnueFullThreatFeaturePieceType,
} from "../constants/nnueFullThreats";
import {
  NNUE_FULL_THREATS_FEATURE_DIMENSIONS,
  NNUE_SQUARE_COUNT,
} from "../constants/nnue";

const PSEUDO_ATTACKS_LO = new Uint32Array(6 * NNUE_SQUARE_COUNT);
const PSEUDO_ATTACKS_HI = new Uint32Array(6 * NNUE_SQUARE_COUNT);
const PAWN_PUSH_OR_ATTACKS_LO = new Uint32Array(2 * NNUE_SQUARE_COUNT);
const PAWN_PUSH_OR_ATTACKS_HI = new Uint32Array(2 * NNUE_SQUARE_COUNT);
const INDEX_LUT_1 = new Int32Array(
  NNUE_FULL_THREAT_FEATURE_PIECE_COUNT *
    NNUE_FULL_THREAT_FEATURE_PIECE_COUNT *
    2,
);
const INDEX_LUT_2 = new Int16Array(
  NNUE_FULL_THREAT_FEATURE_PIECE_COUNT *
    NNUE_SQUARE_COUNT *
    NNUE_SQUARE_COUNT,
);
const FEATURE_OFFSETS = new Int32Array(
  NNUE_FULL_THREAT_FEATURE_PIECE_COUNT * NNUE_SQUARE_COUNT,
);
const CUMULATIVE_PIECE_OFFSETS = new Int32Array(
  NNUE_FULL_THREAT_FEATURE_PIECE_COUNT,
);
const CUMULATIVE_OFFSETS = new Int32Array(
  NNUE_FULL_THREAT_FEATURE_PIECE_COUNT,
);

const getBitboardSquareMask = (square: number): number => 1 << (square & 31);

const hasSquare = (lo: number, hi: number, square: number): boolean =>
  square < 32
    ? (lo & getBitboardSquareMask(square)) !== 0
    : (hi & getBitboardSquareMask(square)) !== 0;

const setSquare = (out: Bitboard32, square: number): void => {
  if (square < 32) {
    out.lo = (out.lo | getBitboardSquareMask(square)) >>> 0;
    return;
  }

  out.hi = (out.hi | getBitboardSquareMask(square)) >>> 0;
};

const popcount32 = (value: number): number => {
  let count = 0;
  let bits = value >>> 0;

  while (bits !== 0) {
    bits = (bits & (bits - 1)) >>> 0;
    count++;
  }

  return count;
};

const popcountBitboard = (lo: number, hi: number): number =>
  popcount32(lo) + popcount32(hi);

const getPieceAttackTableOffset = (
  pieceType: number,
  square: number,
): number => pieceType * NNUE_SQUARE_COUNT + square;

const getPawnPushOrAttackOffset = (
  color: ColorType,
  square: number,
): number => color * NNUE_SQUARE_COUNT + square;

const getFeatureOffsetIndex = (piece: number, square: number): number =>
  piece * NNUE_SQUARE_COUNT + square;

const getIndexLut1Offset = (
  attacker: number,
  attacked: number,
  fromLessThanTo: number,
): number =>
  (attacker * NNUE_FULL_THREAT_FEATURE_PIECE_COUNT + attacked) * 2 +
  fromLessThanTo;

const getIndexLut2Offset = (
  attacker: number,
  from: number,
  to: number,
): number => (attacker * NNUE_SQUARE_COUNT + from) * NNUE_SQUARE_COUNT + to;

const orientFeaturePiece = (
  featurePiece: number,
  perspective: ColorType,
): number => {
  if (perspective === COLOR.WHITE) {
    return featurePiece;
  }

  const flippedColor =
    getNnueFullThreatFeaturePieceColor(featurePiece) === COLOR.WHITE
      ? COLOR.BLACK
      : COLOR.WHITE;

  return getNnueFullThreatFeaturePiece(
    flippedColor,
    getNnueFullThreatFeaturePieceType(featurePiece),
  );
};

const writeGeneratedAttacks = (
  pieceType: number,
  square: number,
  out: Bitboard32,
): void => {
  if (pieceType === KNIGHT_INDEX) {
    generateKnightAttacks(square, 0, 0, out);
    return;
  }

  if (pieceType === BISHOP_INDEX) {
    generateBishopAttacks(square, 0, 0, out);
    return;
  }

  if (pieceType === ROOK_INDEX) {
    generateRookAttacks(square, 0, 0, out);
    return;
  }

  if (pieceType === QUEEN_INDEX) {
    generateQueenAttacks(square, 0, 0, out);
    return;
  }

  generateKingAttacks(square, 0, 0, out);
};

const writePawnPushOrAttacks = (
  color: ColorType,
  square: number,
  out: Bitboard32,
): void => {
  out.lo = 0;
  out.hi = 0;

  if (color === COLOR.WHITE) {
    generateWhitePawnAttacks(square, 0, 0, out);

    if (square >= 8 && square <= 55) {
      setSquare(out, square + 8);
    }

    return;
  }

  generateBlackPawnAttacks(square, 0, 0, out);

  if (square >= 8 && square <= 55) {
    setSquare(out, square - 8);
  }
};

const initializeAttackTables = (): void => {
  const attacks: Bitboard32 = { lo: 0, hi: 0 };

  for (let square = 0; square < NNUE_SQUARE_COUNT; square++) {
    for (const pieceType of [
      KNIGHT_INDEX,
      BISHOP_INDEX,
      ROOK_INDEX,
      QUEEN_INDEX,
    ]) {
      attacks.lo = 0;
      attacks.hi = 0;
      writeGeneratedAttacks(pieceType, square, attacks);

      const offset = getPieceAttackTableOffset(pieceType, square);
      PSEUDO_ATTACKS_LO[offset] = attacks.lo;
      PSEUDO_ATTACKS_HI[offset] = attacks.hi;
    }

    attacks.lo = 0;
    attacks.hi = 0;
    generateKingAttacks(square, 0, 0, attacks);

    const kingOffset = getPieceAttackTableOffset(KING_INDEX, square);
    PSEUDO_ATTACKS_LO[kingOffset] = attacks.lo;
    PSEUDO_ATTACKS_HI[kingOffset] = attacks.hi;

    writePawnPushOrAttacks(COLOR.WHITE, square, attacks);
    PAWN_PUSH_OR_ATTACKS_LO[getPawnPushOrAttackOffset(COLOR.WHITE, square)] =
      attacks.lo;
    PAWN_PUSH_OR_ATTACKS_HI[getPawnPushOrAttackOffset(COLOR.WHITE, square)] =
      attacks.hi;

    writePawnPushOrAttacks(COLOR.BLACK, square, attacks);
    PAWN_PUSH_OR_ATTACKS_LO[getPawnPushOrAttackOffset(COLOR.BLACK, square)] =
      attacks.lo;
    PAWN_PUSH_OR_ATTACKS_HI[getPawnPushOrAttackOffset(COLOR.BLACK, square)] =
      attacks.hi;
  }
};

const getPseudoAttackCountBefore = (
  piece: number,
  from: number,
  to: number,
): number => {
  let count = 0;
  const pieceType = getNnueFullThreatFeaturePieceType(piece);
  const attacksOffset =
    pieceType === PAWN_INDEX
      ? getPawnPushOrAttackOffset(
          getNnueFullThreatFeaturePieceColor(piece),
          from,
        )
      : getPieceAttackTableOffset(pieceType, from);
  const lo =
    pieceType === PAWN_INDEX
      ? PAWN_PUSH_OR_ATTACKS_LO[attacksOffset]
      : PSEUDO_ATTACKS_LO[attacksOffset];
  const hi =
    pieceType === PAWN_INDEX
      ? PAWN_PUSH_OR_ATTACKS_HI[attacksOffset]
      : PSEUDO_ATTACKS_HI[attacksOffset];

  for (let square = 0; square < to; square++) {
    if (hasSquare(lo, hi, square)) {
      count++;
    }
  }

  return count;
};

const getPseudoAttackCount = (piece: number, square: number): number => {
  const pieceType = getNnueFullThreatFeaturePieceType(piece);

  if (pieceType === PAWN_INDEX) {
    const offset = getPawnPushOrAttackOffset(
      getNnueFullThreatFeaturePieceColor(piece),
      square,
    );

    return popcountBitboard(
      PAWN_PUSH_OR_ATTACKS_LO[offset],
      PAWN_PUSH_OR_ATTACKS_HI[offset],
    );
  }

  const offset = getPieceAttackTableOffset(pieceType, square);

  return popcountBitboard(PSEUDO_ATTACKS_LO[offset], PSEUDO_ATTACKS_HI[offset]);
};

const initializeFeatureOffsets = (): void => {
  let cumulativeOffset = 0;

  for (const piece of NNUE_FULL_THREAT_ALL_FEATURE_PIECES) {
    let cumulativePieceOffset = 0;

    for (let square = 0; square < NNUE_SQUARE_COUNT; square++) {
      FEATURE_OFFSETS[getFeatureOffsetIndex(piece, square)] =
        cumulativePieceOffset;

      if (getNnueFullThreatFeaturePieceType(piece) !== PAWN_INDEX) {
        cumulativePieceOffset += getPseudoAttackCount(piece, square);
      } else if (square >= 8 && square <= 55) {
        cumulativePieceOffset += getPseudoAttackCount(piece, square);
      }
    }

    CUMULATIVE_PIECE_OFFSETS[piece] = cumulativePieceOffset;
    CUMULATIVE_OFFSETS[piece] = cumulativeOffset;
    cumulativeOffset +=
      NNUE_FULL_THREAT_NUM_VALID_TARGETS[piece] * cumulativePieceOffset;
  }

  if (cumulativeOffset !== NNUE_FULL_THREATS_FEATURE_DIMENSIONS) {
    throw new Error(
      `Invalid FullThreats dimensions: ${cumulativeOffset} !== ${NNUE_FULL_THREATS_FEATURE_DIMENSIONS}`,
    );
  }
};

const initializeIndexLuts = (): void => {
  INDEX_LUT_1.fill(NNUE_FULL_THREAT_SENTINEL);

  for (const attacker of NNUE_FULL_THREAT_ALL_FEATURE_PIECES) {
    for (const attacked of NNUE_FULL_THREAT_ALL_FEATURE_PIECES) {
      const attackerType = getNnueFullThreatFeaturePieceType(attacker);
      const attackedType = getNnueFullThreatFeaturePieceType(attacked);
      const map =
        NNUE_FULL_THREAT_TARGET_MAP[
          attackerType * 6 + attackedType
        ];
      const enemy =
        getNnueFullThreatFeaturePieceColor(attacker) !==
        getNnueFullThreatFeaturePieceColor(attacked);
      const semiExcluded =
        attackerType === attackedType &&
        (enemy || attackerType !== PAWN_INDEX);
      const targetCount = NNUE_FULL_THREAT_NUM_VALID_TARGETS[attacker] / 2;
      const feature =
        CUMULATIVE_OFFSETS[attacker] +
        (getNnueFullThreatFeaturePieceColor(attacked) * targetCount + map) *
          CUMULATIVE_PIECE_OFFSETS[attacker];
      const excluded = map < 0;

      INDEX_LUT_1[getIndexLut1Offset(attacker, attacked, 0)] = excluded
        ? NNUE_FULL_THREAT_SENTINEL
        : feature;
      INDEX_LUT_1[getIndexLut1Offset(attacker, attacked, 1)] =
        excluded || semiExcluded ? NNUE_FULL_THREAT_SENTINEL : feature;
    }

    for (let from = 0; from < NNUE_SQUARE_COUNT; from++) {
      for (let to = 0; to < NNUE_SQUARE_COUNT; to++) {
        INDEX_LUT_2[getIndexLut2Offset(attacker, from, to)] =
          getPseudoAttackCountBefore(attacker, from, to);
      }
    }
  }
};

initializeAttackTables();
initializeFeatureOffsets();
initializeIndexLuts();

export const makeFullThreatFeatureIndex = (
  perspective: ColorType,
  attacker: number,
  from: number,
  to: number,
  attacked: number,
  kingSquare: number,
): number => {
  if (attacked === NNUE_FULL_THREAT_SENTINEL) {
    return NNUE_FULL_THREAT_SENTINEL;
  }

  const orientation =
    NNUE_FULL_THREAT_ORIENT_TABLE[kingSquare] ^ (56 * perspective);
  const fromOriented = from ^ orientation;
  const toOriented = to ^ orientation;
  const attackerOriented = orientFeaturePiece(attacker, perspective);
  const attackedOriented = orientFeaturePiece(attacked, perspective);
  const baseIndex =
    INDEX_LUT_1[
      getIndexLut1Offset(
        attackerOriented,
        attackedOriented,
        fromOriented < toOriented ? 1 : 0,
      )
    ];

  return (
    baseIndex +
    FEATURE_OFFSETS[getFeatureOffsetIndex(attackerOriented, fromOriented)] +
    INDEX_LUT_2[getIndexLut2Offset(attackerOriented, fromOriented, toOriented)]
  );
};

const appendFeature = (
  activeFeatures: Uint32Array,
  count: number,
  feature: number,
): number => {
  if (feature >= NNUE_FULL_THREATS_FEATURE_DIMENSIONS) {
    return count;
  }

  if (count >= activeFeatures.length) {
    throw new Error("FullThreats active feature buffer overflow");
  }

  activeFeatures[count] = feature;

  return count + 1;
};

const getPieceOnSquareAsFeaturePiece = (
  position: Position,
  square: number,
): number => {
  const stateIndex = position.pieceAt[square];

  if (stateIndex === -1) {
    return NNUE_FULL_THREAT_SENTINEL;
  }

  return stateIndex;
};

const appendPawnThreatFeatures = (
  position: Position,
  perspective: ColorType,
  color: ColorType,
  activeFeatures: Uint32Array,
  startIndex: number,
): number => {
  let count = startIndex;
  const attacker = getNnueFullThreatFeaturePiece(color, PAWN_INDEX);
  const stateIndex = calculatePieceIndex(color, PAWN_INDEX);
  const kingSquare = position.kingSquares[perspective];
  const attacks: Bitboard32 = { lo: 0, hi: 0 };

  forEachBitGetSquare(position.stateLo[stateIndex], position.stateHi[stateIndex], (from) => {
    if (color === COLOR.WHITE) {
      generateWhitePawnAttacks(from, 0, 0, attacks);
    } else {
      generateBlackPawnAttacks(from, 0, 0, attacks);
    }

    const occupiedAttacksLo = attacks.lo & position.allOccupancyLo;
    const occupiedAttacksHi = attacks.hi & position.allOccupancyHi;

    forEachBitGetSquare(occupiedAttacksLo, occupiedAttacksHi, (to) => {
      count = appendFeature(
        activeFeatures,
        count,
        makeFullThreatFeatureIndex(
          perspective,
          attacker,
          from,
          to,
          getPieceOnSquareAsFeaturePiece(position, to),
          kingSquare,
        ),
      );
    });

    const pushTarget = color === COLOR.WHITE ? from + 8 : from - 8;

    if (
      pushTarget >= 0 &&
      pushTarget < NNUE_SQUARE_COUNT &&
      getPieceTypeFromStateIndex(position.pieceAt[pushTarget]) === PAWN_INDEX
    ) {
      count = appendFeature(
        activeFeatures,
        count,
        makeFullThreatFeatureIndex(
          perspective,
          attacker,
          from,
          pushTarget,
          getPieceOnSquareAsFeaturePiece(position, pushTarget),
          kingSquare,
        ),
      );
    }
  });

  return count;
};

const appendPieceThreatFeatures = (
  position: Position,
  perspective: ColorType,
  color: ColorType,
  piece: number,
  activeFeatures: Uint32Array,
  startIndex: number,
  attackScratch: Bitboard32,
): number => {
  let count = startIndex;
  const stateIndex = calculatePieceIndex(color, piece);
  const attacker = getNnueFullThreatFeaturePiece(color, piece);
  const kingSquare = position.kingSquares[perspective];

  forEachBitGetSquare(position.stateLo[stateIndex], position.stateHi[stateIndex], (from) => {
    if (piece === KNIGHT_INDEX) {
      generateKnightAttacks(from, 0, 0, attackScratch);
    } else if (piece === BISHOP_INDEX) {
      generateBishopAttacks(
        from,
        position.allOccupancyLo,
        position.allOccupancyHi,
        attackScratch,
      );
    } else if (piece === ROOK_INDEX) {
      generateRookAttacks(
        from,
        position.allOccupancyLo,
        position.allOccupancyHi,
        attackScratch,
      );
    } else {
      generateQueenAttacks(
        from,
        position.allOccupancyLo,
        position.allOccupancyHi,
        attackScratch,
      );
    }

    const occupiedAttacksLo = attackScratch.lo & position.allOccupancyLo;
    const occupiedAttacksHi = attackScratch.hi & position.allOccupancyHi;

    forEachBitGetSquare(occupiedAttacksLo, occupiedAttacksHi, (to) => {
      count = appendFeature(
        activeFeatures,
        count,
        makeFullThreatFeatureIndex(
          perspective,
          attacker,
          from,
          to,
          getPieceOnSquareAsFeaturePiece(position, to),
          kingSquare,
        ),
      );
    });
  });

  return count;
};

export const appendFullThreatActiveFeatures = (
  position: Position,
  perspective: ColorType,
  activeFeatures: Uint32Array,
  startIndex: number,
  attackScratch: Bitboard32,
): number => {
  let count = startIndex;

  for (let colorOffset = 0; colorOffset < 2; colorOffset++) {
    const color = (perspective ^ colorOffset) as ColorType;

    count = appendPawnThreatFeatures(
      position,
      perspective,
      color,
      activeFeatures,
      count,
    );

    for (const piece of [
      KNIGHT_INDEX,
      BISHOP_INDEX,
      ROOK_INDEX,
      QUEEN_INDEX,
    ]) {
      count = appendPieceThreatFeatures(
        position,
        perspective,
        color,
        piece,
        activeFeatures,
        count,
        attackScratch,
      );
    }
  }

  return count;
};
