# NNUE Models

`defaultCheckpoint/model.dce-nnue` is the active NNUE checkpoint. The training
script uses it as the baseline, and `createDefaultNnueModel()` in the search
code loads it when the file is available.

Search still uses `simpleEval` unless an NNUE evaluator is explicitly supplied.
The checkpoint is the default model for NNUE evaluator construction; it is not a
global replacement for every search call.

Generated training runs are written to `models/nnue/runs/<timestamp>/` and are
ignored by git. A run contains:

- `train.jsonl`
- `validation.jsonl`
- `checkpoints/`
- `report.json`

If `defaultCheckpoint/model.dce-nnue` does not exist, `npm run nnue:train`
creates a deterministic random checkpoint before training. A candidate replaces
the default checkpoint only when validation improves and, unless `--skip-games`
is used, the Stockfish match score does not regress.
