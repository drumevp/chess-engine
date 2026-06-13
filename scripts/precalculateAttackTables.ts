import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { inspect } from "util";
import tables from "../src/engine/tables/generate/generateTables";

const OUT_DIR = path.join(process.cwd(), "/src/engine/tables/generated");

function valueToCode(value: unknown): string {
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const constructorName = value.constructor.name;
    const values = Array.from(value as unknown as ArrayLike<number>);

    return `new ${constructorName}(${inspect(values, {
      depth: null,
      maxArrayLength: null,
      breakLength: 120,
    })})`;
  }

  return inspect(value, {
    depth: null,
    maxArrayLength: null,
    breakLength: 120,
  });
}

function writeTableFile(
  fileName: string,
  exportName: string,
  table: unknown,
  typeAnnotation?: string,
) {
  mkdirSync(OUT_DIR, { recursive: true });

  const type = typeAnnotation ? `: ${typeAnnotation}` : "";

  const code = `// Auto-generated. Do not edit manually.

export const ${exportName}${type} = ${valueToCode(table)};
`;

  writeFileSync(path.join(OUT_DIR, fileName), code, "utf8");
}

writeTableFile(
  "kingAttacksLo.ts",
  "kingAttacksLo",
  tables.kingAttacksLo,
  "Uint32Array",
);
writeTableFile(
  "kingAttacksHi.ts",
  "kingAttacksHi",
  tables.kingAttacksHi,
  "Uint32Array",
);
writeTableFile(
  "knightAttacksLo.ts",
  "knightAttacksLo",
  tables.knightAttacksLo,
  "Uint32Array",
);
writeTableFile(
  "knightAttacksHi.ts",
  "knightAttacksHi",
  tables.knightAttacksHi,
  "Uint32Array",
);
writeTableFile(
  "whitePawnAttacksLo.ts",
  "whitePawnAttacksLo",
  tables.whitePawnAttacksLo,
  "Uint32Array",
);
writeTableFile(
  "whitePawnAttacksHi.ts",
  "whitePawnAttacksHi",
  tables.whitePawnAttacksHi,
  "Uint32Array",
);
writeTableFile(
  "blackPawnAttacksLo.ts",
  "blackPawnAttacksLo",
  tables.blackPawnAttacksLo,
  "Uint32Array",
);
writeTableFile(
  "blackPawnAttacksHi.ts",
  "blackPawnAttacksHi",
  tables.blackPawnAttacksHi,
  "Uint32Array",
);
writeTableFile(
  "rookRelevantBlockerMasksLo.ts",
  "rookRelevantBlockerMasksLo",
  tables.rookRelevantBlockerMasksLo,
  "Uint32Array",
);
writeTableFile(
  "rookRelevantBlockerMasksHi.ts",
  "rookRelevantBlockerMasksHi",
  tables.rookRelevantBlockerMasksHi,
  "Uint32Array",
);
writeTableFile(
  "rookShifts.ts",
  "rookShifts",
  new Uint8Array(tables.rookShifts),
  "Uint8Array",
);
writeTableFile(
  "rookMagicNumbersLo.ts",
  "rookMagicNumbersLo",
  tables.rookMagicNumbersLo,
  "Uint32Array",
);
writeTableFile(
  "rookMagicNumbersHi.ts",
  "rookMagicNumbersHi",
  tables.rookMagicNumbersHi,
  "Uint32Array",
);
writeTableFile(
  "rookMagicAttackOffsets.ts",
  "rookMagicAttackOffsets",
  tables.rookMagicAttackOffsets,
  "Uint32Array",
);
writeTableFile(
  "rookMagicAttacksLo.ts",
  "rookMagicAttacksLo",
  tables.rookMagicAttacksLo,
  "Uint32Array",
);
writeTableFile(
  "rookMagicAttacksHi.ts",
  "rookMagicAttacksHi",
  tables.rookMagicAttacksHi,
  "Uint32Array",
);
writeTableFile(
  "bishopRelevantBlockerMasksLo.ts",
  "bishopRelevantBlockerMasksLo",
  tables.bishopRelevantBlockerMasksLo,
  "Uint32Array",
);
writeTableFile(
  "bishopRelevantBlockerMasksHi.ts",
  "bishopRelevantBlockerMasksHi",
  tables.bishopRelevantBlockerMasksHi,
  "Uint32Array",
);
writeTableFile(
  "bishopShifts.ts",
  "bishopShifts",
  new Uint8Array(tables.bishopShifts),
  "Uint8Array",
);
writeTableFile(
  "bishopMagicNumbersLo.ts",
  "bishopMagicNumbersLo",
  tables.bishopMagicNumbersLo,
  "Uint32Array",
);
writeTableFile(
  "bishopMagicNumbersHi.ts",
  "bishopMagicNumbersHi",
  tables.bishopMagicNumbersHi,
  "Uint32Array",
);
writeTableFile(
  "bishopMagicAttackOffsets.ts",
  "bishopMagicAttackOffsets",
  tables.bishopMagicAttackOffsets,
  "Uint32Array",
);
writeTableFile(
  "bishopMagicAttacksLo.ts",
  "bishopMagicAttacksLo",
  tables.bishopMagicAttacksLo,
  "Uint32Array",
);
writeTableFile(
  "bishopMagicAttacksHi.ts",
  "bishopMagicAttacksHi",
  tables.bishopMagicAttacksHi,
  "Uint32Array",
);
writeTableFile(
  "squareBitboardsLo.ts",
  "squareBitboardsLo",
  tables.squareBitboardsLo,
  "Uint32Array",
);
writeTableFile(
  "squareBitboardsHi.ts",
  "squareBitboardsHi",
  tables.squareBitboardsHi,
  "Uint32Array",
);
writeTableFile(
  "betweenSquaresLo.ts",
  "betweenSquaresLo",
  tables.betweenSquaresLo,
  "Uint32Array",
);
writeTableFile(
  "betweenSquaresHi.ts",
  "betweenSquaresHi",
  tables.betweenSquaresHi,
  "Uint32Array",
);
writeTableFile(
  "zobristCastlingMaskKeys.ts",
  "zobristCastlingMaskKeys",
  tables.zobristCastlingMaskKeys,
  "bigint[]",
);

writeTableFile(
  "zobristPieceSquareKeys.ts",
  "zobristPieceSquareKeys",
  tables.zobristPieceSquareKeys,
  "bigint[][]",
);

writeTableFile(
  "zobristEnPassantFileKeys.ts",
  "zobristEnPassantFileKeys",
  tables.zobristEnPassantFileKeys,
  "bigint[]",
);

writeTableFile(
  "zobristBlackToMoveKey.ts",
  "zobristBlackToMoveKey",
  tables.zobristBlackToMoveKey,
  "bigint",
);
