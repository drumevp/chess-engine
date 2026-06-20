#!/usr/bin/env node

import { createInterface } from "node:readline";
import { UciEngine } from "./UciEngine";

const engine = new UciEngine({
  writeLine: (line) => {
    process.stdout.write(`${line}\n`);
  },
});
const input = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
  terminal: false,
});

try {
  for await (const line of input) {
    if (!(await engine.handleCommand(line))) {
      break;
    }
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
} finally {
  input.close();
  await engine.close();
}
