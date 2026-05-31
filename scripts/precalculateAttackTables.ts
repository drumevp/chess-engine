import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { inspect } from "util";
import tables from "../src/engine/lookupTables/main";

const OUT_DIR = path.join(process.cwd(), "precalculatedData/");

function denseBigInt2D(table: Array<Array<bigint | undefined>>): bigint[][] {
  return Array.from({ length: table.length }, (_, outerIndex) => {
    const inner = table[outerIndex] ?? [];

    return Array.from({ length: inner.length }, (_, innerIndex) => {
      return inner[innerIndex] ?? 0n;
    });
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

export const ${exportName}${type} = ${inspect(table, {
    depth: null,
    maxArrayLength: null,
    breakLength: 120,
})};
`;

  writeFileSync(path.join(OUT_DIR, fileName), code, "utf8");
}

writeTableFile("kingAttacks.ts", "kingAttacks", tables.kingAttacks, "bigint[]");
writeTableFile("knightAttacks.ts", "knightAttacks", tables.knightAttacks, "bigint[]");

writeTableFile("whitePawnAttacks.ts", "whitePawnAttacks", tables.whitePawnAttacks, "bigint[]");
writeTableFile("blackPawnAttacks.ts", "blackPawnAttacks", tables.blackPawnAttacks, "bigint[]");

writeTableFile(
  "rookRelevantBlockerMasks.ts",
  "rookRelevantBlockerMasks",
  tables.rookRelevantBlockerMasks,
  "bigint[]",
);

writeTableFile("rookShifts.ts", "rookShifts", tables.rookShifts, "number[]");
writeTableFile("rookMagicNumbers.ts", "rookMagicNumbers", tables.rookMagicNumbers, "bigint[]");

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

writeTableFile("bishopShifts.ts", "bishopShifts", tables.bishopShifts, "number[]");
writeTableFile("bishopMagicNumbers.ts", "bishopMagicNumbers", tables.bishopMagicNumbers, "bigint[]");

writeTableFile(
  "bishopMagicAttacks.ts",
  "bishopMagicAttacks",
  denseBigInt2D(tables.bishopMagicAttacks as Array<Array<bigint | undefined>>),
  "bigint[][]",
);

writeTableFile("squareBitboards.ts", "squareBitboards", tables.squareBitboards, "bigint[]");