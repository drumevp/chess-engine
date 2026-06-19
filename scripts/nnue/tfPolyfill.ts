import nodeUtil from "node:util";

if (typeof (nodeUtil as Record<string, unknown>).isNullOrUndefined !== "function") {
  (nodeUtil as Record<string, unknown>).isNullOrUndefined = (val: unknown): val is null | undefined =>
    val === null || val === undefined;
}

if (typeof (nodeUtil as Record<string, unknown>).isArray !== "function") {
  (nodeUtil as Record<string, unknown>).isArray = Array.isArray;
}
