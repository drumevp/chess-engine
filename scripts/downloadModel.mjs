import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_RELATIVE_PATH = "models/nnue/defaultCheckpoint/model.dce-nnue";
const MODEL_URL =
  process.env.NNUE_MODEL_URL ??
  "https://github.com/drumevp/chess-engine/releases/download/model-v1/model.dce-nnue";
const PACKAGE_ROOT = resolve(__dirname, "..");
const MODEL_PATH = resolve(PACKAGE_ROOT, MODEL_RELATIVE_PATH);
const POINTER_HEADER = "version https://git-lfs.github.com/spec/v1";

const isLfsPointer = (filePath) => {
  try {
    const firstLine = readFileSync(filePath, "utf8").split("\n")[0];
    return firstLine === POINTER_HEADER;
  } catch {
    return false;
  }
};

const downloadFile = (url, dest) =>
  new Promise((resolvePromise, rejectPromise) => {
    const file = createWriteStream(dest);
    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        return downloadFile(response.headers.location, dest).then(
          resolvePromise,
          rejectPromise,
        );
      }
      if (response.statusCode !== 200) {
        file.close();
        rejectPromise(
          new Error(`HTTP ${response.statusCode} for ${url}`),
        );
        return;
      }
      const total = parseInt(response.headers["content-length"] ?? "0", 10);
      let downloaded = 0;
      let lastLog = 0;
      response.on("data", (chunk) => {
        downloaded += chunk.length;
        const pct = total ? Math.round((downloaded / total) * 100) : 0;
        if (pct - lastLog >= 5) {
          process.stderr.write(`\rDownloading model... ${pct}%`);
          lastLog = pct;
        }
      });
      response.pipe(file);
      file.on("finish", () => {
        process.stderr.write(`\rDownloading model... 100%\n`);
        file.close();
        resolvePromise();
      });
    }).on("error", (err) => {
      file.close();
      rejectPromise(err);
    });
  });

const main = async () => {
  const dir = dirname(MODEL_PATH);
  if (existsSync(MODEL_PATH) && !isLfsPointer(MODEL_PATH)) {
    console.error(`Model already exists at ${MODEL_RELATIVE_PATH}`);
    return;
  }

  if (existsSync(MODEL_PATH)) {
    await unlink(MODEL_PATH);
  }

  console.error(`Downloading NNUE model from ${MODEL_URL}`);
  await mkdir(dir, { recursive: true });
  await downloadFile(MODEL_URL, MODEL_PATH);
  console.error(`Model saved to ${MODEL_RELATIVE_PATH}`);
};

main().catch((err) => {
  console.error(`Failed to download model: ${err.message}`);
  console.error("The engine will use a seeded random model instead.");
});
