# NNUE Training

Run all NNUE training through one command:

```bash
npm run nnue:train -- --positions 1000000 --epochs 2 --batch-size 1024
```

The default `tensor` backend runs batched training through TensorFlow.js' native
TensorFlow CPU binding. The old one-position-at-a-time TypeScript trainer remains
available as `--backend scalar` for parity debugging, but it is not intended for
large runs.

On the 16 GB Apple Silicon development machine, measured tensor throughput is
roughly 150k positions/s for PSQT, 28k/s for the dense network, and 5.5k/s when
updating the 23 million HalfKA transformer weights. FullThreat training is a
later-stage operation and is much slower. Throughput depends on CPU and batch
size; `1024` is the tested default for HalfKA on this machine.

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
      train.features.bin
      validation.jsonl
      checkpoints/
      report.json
```

`defaultCheckpoint/model.dce-nnue` is the active promoted NNUE, and
`createDefaultNnueModel()` loads it when the file is available. Search still
uses `simpleEval` unless an NNUE evaluator is explicitly supplied.

Training starts from a deterministic material-seeded NNUE by default. This gives
search a useful score before the first gradient update and lets the network learn
positional corrections instead of rediscovering piece values. Use `--base default`
to continue the promoted checkpoint or `--base <checkpoint>` to continue a
specific candidate. A candidate only replaces the default when validation
improves by a meaningful margin, bucketed validation does not regress badly, the
candidate output is not too close to zero, and enough Stockfish games show a
match-score improvement. If `--skip-games` is used, promotion is blocked unless
`--allow-validation-only-promote` is also set. A material or explicit-path base
also requires `--allow-nondefault-base-promote`, preventing a run from replacing
an unrelated active checkpoint without an explicit decision.

`models/nnue/runs/` is generated output and is ignored by git.

## Useful Commands

Fast smoke test:

```bash
npm run nnue:train -- \
  --positions 100000 \
  --validation-positions 10000 \
  --epochs 1 \
  --games-per-elo 2 \
  --elos 1320 \
  --no-promote
```

First meaningful local training run:

```bash
npm run nnue:train -- \
  --backend tensor \
  --base material \
  --positions 1000000 \
  --validation-positions 50000 \
  --epochs 2 \
  --batch-size 1024 \
  --sample-multiplier 4 \
  --games-per-elo 16 \
  --elos 1320 \
  --no-promote \
  --log-every 100000
```

Train without playing games, useful while tuning loss or data filters:

```bash
npm run nnue:train -- \
  --positions 1000000 \
  --validation-positions 50000 \
  --epochs 2 \
  --skip-games \
  --no-promote
```

Reuse a dataset without decompressing and filtering the Lichess dump again:

```bash
npm run nnue:train -- \
  --reuse-dataset models/nnue/runs/<previous-run> \
  --base models/nnue/runs/<previous-run>/checkpoints/<candidate>.dce-nnue \
  --positions 1000000 \
  --psqt-epochs 0 \
  --network-epochs 1 \
  --feature-epochs 2 \
  --skip-games \
  --no-promote
```

Only enable FullThreat training after the HalfKA candidate is clearly useful.
It has roughly 60 million additional weights and is intentionally not part of
the fast default stages:

```bash
npm run nnue:train -- \
  --reuse-dataset models/nnue/runs/<large-run> \
  --base models/nnue/runs/<large-run>/checkpoints/<candidate>.dce-nnue \
  --psqt-epochs 0 \
  --network-epochs 0 \
  --feature-epochs 0 \
  --train-full-threats \
  --full-threat-epochs 1 \
  --batch-size 256 \
  --skip-games \
  --no-promote
```

## Strength Expectations

`100000` positions is a pipeline test, not enough coverage for this architecture.
One million positions is the first useful local milestone. A 2800-level engine
will require repeated multi-million-position runs, broader game-based testing,
later FullThreat training, and continued search tuning; the trainer makes that
iteration practical but does not turn a small static-eval slice into 2800 Elo.
Use paired openings and at least 64 games before promoting a checkpoint.

Run a standalone limited-strength check with:

```bash
npm run nnue:elo -- \
  --model models/nnue/runs/<run>/checkpoints/<candidate>.dce-nnue \
  --games 64 \
  --opponent-elo 1320 \
  --our-depth 4 \
  --our-movetime 50 \
  --stockfish-movetime 50
```

## Data Filtering

The script streams the Lichess eval database and keeps positions that satisfy:

- highest-depth eval has a first PV with centipawn score
- no mate labels
- `abs(scoreCp) <= --max-abs-cp` defaults to `3000`
- side to move is not in check
- record contains a principal variation, which excludes terminal positions;
  `--validate-legal-positions` additionally verifies this with move generation
- position can be encoded by the NNUE feature buffers

Lichess scores are converted from White perspective to side-to-move perspective
before training.

Training samples are selected with seeded random sampling and written through a
shuffle buffer, so runs are not always trained on the same first positions from
the compressed file.

## Validation

Every run writes and evaluates a held-out validation set:

- `zero eval MAE`: always predicts `0`
- `default NNUE MAE`: current `defaultCheckpoint/model.dce-nnue`
- `candidate NNUE MAE`: newly trained checkpoint after quantization

Validation also prints output distribution diagnostics for target/default/candidate
scores and bucketed MAE by `abs(targetCp)`. This matters because a model that
predicts values too close to zero can look decent on global MAE while playing
very badly.

Output calibration is experimental and disabled by default. Enable it with
`--calibrate-output`; ordinary training should learn the output scale directly.

Training is not bucket-weighted by default. The previous weighting underweighted
quiet positions and produced noisy scores around equality. `--bucket-weighting`
enables a much milder decisive-position weighting for experiments.

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
- `--backend`: `tensor` by default; `scalar` is the slow reference trainer
- `--base`: `material` by default, `default`, or a checkpoint path
- `--reuse-dataset`: directory containing existing train/validation JSONL files
- `--batch-size`: tensor batch size, `1024` by default
- `--psqt-epochs`: fast material/PSQT bootstrap passes, `1` by default
- `--network-epochs`: dense network passes with the transformer frozen
- `--feature-epochs`: full HalfKA transformer passes
- `--train-full-threats`: opt into the expensive FullThreat stage
- `--validation-positions`: held-out validation positions
- `--sample-multiplier`: spreads selection across more accepted Lichess rows
- `--shuffle-buffer`: larger means better local shuffling, more memory
- `--train-reeval-positions`: training records to re-evaluate after export
- `--min-depth`: minimum Stockfish depth in the Lichess eval record
- `--max-abs-cp`: discards extreme centipawn labels
- `--loss`: `mixed` by default, combining logistic WDL loss with a small CP
  Huber term
- `--float-epochs`: epochs that train with float forward values instead of
  immediate rounding
- `--qat-epochs`: quantization-aware fine-tune epochs
- `--threat-warmup-epochs`: float epochs that leave FullThreat weights frozen
- `--learning-rate`: base learning rate
- `--wdl-scale`: centipawn scale for the logistic WDL target
- `--cp-loss-weight`: CP Huber loss weight used by `mixed`
- `--bucket-weighting`: mildly upweights decisive target buckets
- `--calibration-positions`: training records used to fit output calibration
- `--calibrate-output`: enables the experimental output calibration pass
- `--error-clamp`: caps per-position gradient from raw centipawn error
- `--games-per-elo`: Stockfish games per Elo for default-vs-candidate gating
- `--min-validation-improvement-cp`: required MAE improvement before promotion
- `--min-promotion-games`: required candidate Stockfish games before promotion
- `--min-candidate-target-abs-ratio`: blocks timid candidates whose average
  absolute output is too small relative to the target labels
- `--no-promote`: never replace the default checkpoint
- `--skip-games`: skip Stockfish games; promotion is blocked unless
  `--allow-validation-only-promote` is also set
- `--allow-nondefault-base-promote`: permit a material/path-based candidate to
  replace the active default checkpoint
