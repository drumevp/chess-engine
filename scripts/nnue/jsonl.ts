import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type JsonlWriter = {
  write: (record: unknown) => Promise<void>;
  close: () => Promise<void>;
};

export const createJsonlWriter = async (
  outputPath: string,
): Promise<JsonlWriter> => {
  await mkdir(dirname(outputPath), { recursive: true });

  const stream = createWriteStream(outputPath, { flags: "w" });
  let closed = false;

  return {
    write: async (record): Promise<void> => {
      if (!stream.write(`${JSON.stringify(record)}\n`)) {
        await once(stream, "drain");
      }
    },
    close: async (): Promise<void> => {
      if (closed) {
        return;
      }

      closed = true;
      stream.end();
      await once(stream, "finish");
    },
  };
};
