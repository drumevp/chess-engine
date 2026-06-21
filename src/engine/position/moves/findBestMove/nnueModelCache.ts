import { createDefaultNnueModel, loadNnueModelFromPath, setDefaultNnueModelBuffer } from "../../../../search/nnue/defaultModel";
import type { NnueModel } from "../../../../search/types/nnue";

type CachedModel = { key: string; model: NnueModel };

let cachedModel: Promise<CachedModel> | null = null;

const getCachedNnueModel = async (
  modelPath?: string,
  modelUrl?: string,
): Promise<NnueModel> => {
  const key = modelUrl ?? (modelPath ?? "default");

  if (cachedModel !== null) {
    const current = await cachedModel;
    if (current.key === key) {
      return current.model;
    }
  }

  const loadPromise = (async (): Promise<CachedModel> => {
    if (modelUrl) {
      const response = await fetch(modelUrl);
      const buffer = new Uint8Array(await response.arrayBuffer());
      setDefaultNnueModelBuffer(buffer);
      return { key, model: await createDefaultNnueModel() };
    }

    return { key, model: await loadNnueModelFromPath(modelPath) };
  })();

  cachedModel = loadPromise;
  const result = await loadPromise;
  return result.model;
};

export default getCachedNnueModel;
