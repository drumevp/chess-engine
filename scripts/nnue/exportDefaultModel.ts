import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import { writeNnueCheckpoint } from "./modelFiles";

const outputPath = await writeNnueCheckpoint(createDefaultNnueModel());
console.log(`Wrote ${outputPath}`);
