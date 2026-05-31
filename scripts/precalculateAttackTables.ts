import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { inspect } from "util";
import tables from '../src/engine/lookupTables/main'

const OUT_DIR = path.join(process.cwd(), "precalculatedData/");

function writeTableFile(
    fileName: string,
    exportName: string,
    table: unknown,
) {
    mkdirSync(OUT_DIR, { recursive: true });

    const code = `// Auto-generated. Do not edit manually.

export const ${exportName} = ${inspect(table, {
    depth: null,
    maxArrayLength: null,
    breakLength: 120,
})};
`;

    writeFileSync(path.join(OUT_DIR, fileName), code, "utf8");
}

writeTableFile("kingAttacks.ts", "kingAttacks", tables.kingAttacks);
writeTableFile("knightAttacks.ts", "knightAttacks", tables.knightAttacks);
writeTableFile("whitePawnAttacks.ts", "whitePawnAttacks", tables.whitePawnAttacks);
writeTableFile("blackPawnAttacks.ts", "blackPawnAttacks", tables.blackPawnAttacks);
writeTableFile("rookRelevantBlockerMasks.ts", "rookRelevantBlockerMasks", tables.rookRelevantBlockerMasks);
writeTableFile("rookShifts.ts", "rookShifts", tables.rookShifts);
writeTableFile("rookMagicNumbers.ts", "rookMagicNumbers", tables.rookMagicNumbers);
writeTableFile("rookMagicAttacks.ts", "rookMagicAttacks", tables.rookMagicAttacks);
writeTableFile("bishopRelevantBlockerMasks.ts", "bishopRelevantBlockerMasks", tables.bishopRelevantBlockerMasks);
writeTableFile("bishopShifts.ts", "bishopShifts", tables.bishopShifts);
writeTableFile("bishopMagicNumbers.ts", "bishopMagicNumbers", tables.bishopMagicNumbers);
writeTableFile("bishopMagicAttacks.ts", "bishopMagicAttacks", tables.bishopMagicAttacks);
writeTableFile("squareBitboards.ts", "squareBitboards", tables.squareBitboards);