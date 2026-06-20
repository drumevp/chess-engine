import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const STOCKFISH_REPO_URL =
  process.env.STOCKFISH_REPO_URL ??
  "https://github.com/official-stockfish/Stockfish.git";
const stockfishDirectory = resolve(
  process.env.STOCKFISH_DIR ?? "engines/stockfish",
);
const stockfishSourceDirectory = resolve(stockfishDirectory, "src");
const buildTarget = process.env.STOCKFISH_BUILD_TARGET ?? "build";
const architecture = process.env.STOCKFISH_ARCH ?? "native";
const jobs = process.env.STOCKFISH_JOBS ?? String(Math.max(1, cpus().length));

const run = (command: string, args: string[], cwd = process.cwd()) =>
  new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(`${command} ${args.join(" ")} failed with code ${code}`),
      );
    });
  });

if (!existsSync(stockfishDirectory)) {
  await run("git", ["clone", "--depth", "1", STOCKFISH_REPO_URL, stockfishDirectory]);
}

await run(
  "make",
  [`-j${jobs}`, buildTarget, `ARCH=${architecture}`],
  stockfishSourceDirectory,
);

console.log(`Stockfish is ready in ${stockfishSourceDirectory}`);
