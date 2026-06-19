# NNUE Training

Run all NNUE training through one command:

```bash
npm run nnue:train -- --positions 500000 --epochs 1
```

The script expects the Lichess eval dump at:

```text
lichess_data/lichess_db_eval.jsonl.zst
```

Override it with `--data <path>` if needed.

## Model Layout

```text
models/nnue/
  README.md
  defaultCheckpoint/
    model.dce-nnue
  runs/
    <timestamp>/
      train.jsonl
      validation.jsonl
      checkpoints/
      report.json
```

`defaultCheckpoint/model.dce-nnue` is the current baseline NNUE. The training
script loads it before training, and `createDefaultNnueModel()` in the search
code also loads it when the file is available. Search still uses `simpleEval`
unless an NNUE evaluator is explicitly supplied.

If the checkpoint does not exist, the training script creates a deterministic
random checkpoint before training. A candidate only replaces it when validation
improves and, unless `--skip-games` is used, Stockfish match score does not
regress.

`models/nnue/runs/` is generated output and is ignored by git.

## Useful Commands

Fast smoke test:

```bash
npm run nnue:train -- \
  --positions 5000 \
  --validation-positions 1000 \
  --epochs 1 \
  --games-per-elo 2 \
  --elos 1320 \
  --no-promote
```

Real local training run:

```bash
npm run nnue:train -- \
  --positions 500000 \
  --validation-positions 25000 \
  --epochs 1 \
  --games-per-elo 32 \
  --elos 1320,1600 \
  --log-every 25000
```

Train without playing games, useful while tuning loss or data filters:

```bash
npm run nnue:train -- \
  --positions 500000 \
  --validation-positions 25000 \
  --skip-games \
  --no-promote
```

## Data Filtering

The script streams the Lichess eval database and keeps positions that satisfy:

- highest-depth eval has a first PV with centipawn score
- no mate labels
- `abs(scoreCp) <= --max-abs-cp` defaults to `3000`
- side to move is not in check
- position is not terminal
- position can be encoded by the NNUE feature buffers

Lichess scores are converted from White perspective to side-to-move perspective
before training.

Training samples are selected with seeded random sampling and written through a
shuffle buffer, so runs are not always trained on the same first positions from
the compressed file.

## Validation

Every run writes and evaluates a held-out validation set:

- `zero eval MAE`: always predicts `0`
- `simpleEval MAE`: current material eval
- `default NNUE MAE`: current `defaultCheckpoint/model.dce-nnue`
- `candidate NNUE MAE`: newly trained checkpoint after quantization

The script also re-evaluates the training set after exporting the candidate:

- `train online MAE`: online training error while weights were being updated
- `candidate train reeval MAE`: exported candidate checkpoint evaluated again on
  the training records

If online train MAE is low but train reeval MAE is high, the export/inference
path is wrong. If both are low but validation MAE is high, the model is
overfitting the training slice.

If `zero eval MAE` is close to the NNUE MAE, the dataset slice is mostly equal
positions and validation is not proving chess strength yet. Use larger and more
varied samples before trusting game results.

## Important Options

- `--positions`: number of training positions
- `--validation-positions`: held-out validation positions
- `--sample-multiplier`: spreads selection across more accepted Lichess rows
- `--shuffle-buffer`: larger means better local shuffling, more memory
- `--train-reeval-positions`: training records to re-evaluate after export
- `--min-depth`: minimum Stockfish depth in the Lichess eval record
- `--max-abs-cp`: discards extreme centipawn labels
- `--learning-rate`: base learning rate
- `--error-clamp`: caps per-position gradient from raw centipawn error
- `--games-per-elo`: Stockfish games per Elo for default-vs-candidate gating
- `--no-promote`: never replace the default checkpoint
- `--skip-games`: skip Stockfish games and gate only by validation
