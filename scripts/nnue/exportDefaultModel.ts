import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import { writeNnueCheckpoint } from "./modelFiles";

const model = await createDefaultNnueModel();
const outputPath = await writeNnueCheckpoint(model);
console.log(`Wrote ${outputPath}`);
