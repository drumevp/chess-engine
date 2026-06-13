import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { inspect } from "util";
import tables from "../src/engine/tables/generate/generateTables";

const OUT_DIR = path.join(process.cwd(), "/src/engine/tables/generated");

function denseBigInt2D(table: Array<Array<bigint | undefined>>): bigint[][] {
  return Array.from({ length: table.length }, (_, outerIndex) => {
    const inner = table[outerIndex] ?? [];

    return Array.from({ length: inner.length }, (_, innerIndex) => {
      return inner[innerIndex] ?? 0n;
    });
  });
}

function valueToCode(value: unknown): string {
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

writeTableFile("kingAttacks.ts", "kingAttacks", tables.kingAttacks, "bigint[]");
writeTableFile(
  "knightAttacks.ts",
  "knightAttacks",
  tables.knightAttacks,
  "bigint[]",
);

writeTableFile(
  "whitePawnAttacks.ts",
  "whitePawnAttacks",
  tables.whitePawnAttacks,
  "bigint[]",
);
writeTableFile(
  "blackPawnAttacks.ts",
  "blackPawnAttacks",
  tables.blackPawnAttacks,
  "bigint[]",
);

writeTableFile(
  "rookRelevantBlockerMasks.ts",
  "rookRelevantBlockerMasks",
  tables.rookRelevantBlockerMasks,
  "bigint[]",
);

writeTableFile("rookShifts.ts", "rookShifts", tables.rookShifts, "number[]");
writeTableFile(
  "rookMagicNumbers.ts",
  "rookMagicNumbers",
  tables.rookMagicNumbers,
  "bigint[]",
);

writeTableFile(
  "rookMagicAttacks.ts",
  "rookMagicAttacks",
  denseBigInt2D(tables.rookMagicAttacks as Array<Array<bigint | undefined>>),
  "bigint[][]",
);

writeTableFile(
  "bishopRelevantBlockerMasks.ts",
  "bishopRelevantBlockerMasks",
  tables.bishopRelevantBlockerMasks,
  "bigint[]",
);

writeTableFile(
  "bishopShifts.ts",
  "bishopShifts",
  tables.bishopShifts,
  "number[]",
);
writeTableFile(
  "bishopMagicNumbers.ts",
  "bishopMagicNumbers",
  tables.bishopMagicNumbers,
  "bigint[]",
);

writeTableFile(
  "bishopMagicAttacks.ts",
  "bishopMagicAttacks",
  denseBigInt2D(tables.bishopMagicAttacks as Array<Array<bigint | undefined>>),
  "bigint[][]",
);

writeTableFile(
  "squareBitboards.ts",
  "squareBitboards",
  tables.squareBitboards,
  "bigint[]",
);

writeTableFile(
  "betweenSquares.ts",
  "betweenSquares",
  denseBigInt2D(tables.betweenSquares as Array<Array<bigint | undefined>>),
  "bigint[][]",
);

writeTableFile(
  "zobristPieceSquareKeys.ts",
  "zobristPieceSquareKeys",
  denseBigInt2D(
    tables.zobristPieceSquareKeys as Array<Array<bigint | undefined>>,
  ),
  "bigint[][]",
);

writeTableFile(
  "zobristCastlingMaskKeys.ts",
  "zobristCastlingMaskKeys",
  tables.zobristCastlingMaskKeys,
  "bigint[]",
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
