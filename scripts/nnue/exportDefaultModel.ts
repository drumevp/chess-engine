import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createDefaultNnueModel } from "../../src/search/nnue/defaultModel";
import { serializeNnueModel } from "../../src/search/nnue/serialization";

const checkpointDirectory = resolve("models/nnue/checkpoints");
const timestamp = new Date().toISOString().replaceAll(":", "-");
const model = createDefaultNnueModel();
const outputPath = resolve(
  checkpointDirectory,
  `${timestamp}--${model.metadata.id}.dce-nnue`,
);

await mkdir(checkpointDirectory, { recursive: true });
await writeFile(outputPath, serializeNnueModel(model));

console.log(`Wrote ${outputPath}`);
