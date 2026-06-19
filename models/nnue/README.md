# NNUE Models

`defaultCheckpoint/model.dce-nnue` is the active promoted NNUE checkpoint, and
`createDefaultNnueModel()` loads it when the file is available. Training starts
from a material seed unless `--base default` or `--base <path>` is supplied.

Search still uses `simpleEval` unless an NNUE evaluator is explicitly supplied.
The checkpoint is the default model for NNUE evaluator construction; it is not a
global replacement for every search call.

Generated training runs are written to `models/nnue/runs/<timestamp>/` and are
ignored by git. A run contains:

- `train.jsonl`
- `train.features.bin`
- `validation.jsonl`
- `checkpoints/`
- `report.json`

`npm run nnue:train` starts from a deterministic material-seeded model by
default; use `--base default` to continue this directory's checkpoint. A
candidate replaces
the default checkpoint only when it clears the stricter promotion gates:
meaningful validation improvement, no large bucketed-validation regression,
non-timid output distribution, enough candidate Stockfish games, and improved
match score. When games are skipped, promotion is blocked unless
`--allow-validation-only-promote` is set.
