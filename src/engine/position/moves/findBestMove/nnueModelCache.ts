import { loadNnueModelFromPath } from "../../../../search/nnue/defaultModel";
import type { NnueModel } from "../../../../search/types/nnue";

let cachedModel: { key: string; model: NnueModel } | null = null;

const getCachedNnueModel = (modelPath?: string): NnueModel => {
  const key = modelPath ?? "default";

  if (cachedModel?.key !== key) {
    cachedModel = {
      key,
      model: loadNnueModelFromPath(modelPath),
    };
  }

  return cachedModel.model;
};

export default getCachedNnueModel;
