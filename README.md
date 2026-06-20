# Chess Engine

This library includes a custom 2x32bit bitboard legal move generator, search mostly based on the stockfish architecture, UCI and a custom built and trained evaluator based on the NNUE architecture.

Currently wins 4/8 games against `https://github.com/official-stockfish/stockfish` at 2200 ELO. Both running at 500ms per move on 2 threads on my machine.

To improve the results, both the search and eval model need to be further optimized.

# Installation

I am using `node -v` = `v26.1.0`

To install: `npm install @drumevp/chess-engine`

This will automatically download the lastest evaluator nnue model weights file.

# Local Usage

- `npm install` for dev dependencies. This library doesn't rely on any other dependencies.
- `npm run build`
- To pull the evaluator (nnue) model, either use `git-lfs pull` or download it from Releases. It sits under `/models/defaultCheckpoint/`

# Features

- Interface for generating legal moves, making, undoing moves and more. The exported `ChessEngine` has everything to build a fully functional frontend for playing chess. I built myself a demo to test certain positions out.
- Tracking for game outcome based on the current position: `checkmate`, `stalemate`, `draw`, `ongoing`. For draw, it handles: `threefold repetition`, `50 halfmove clock draw`, `insufficient material`. Though the insufficient material handler only determines it is a draw if the position is theoretically impossible to win. If it is theoretically possible, it will not be considered a draw.
- Custom generator for attack tables, blocker masks, magic bitboards and so on for quick access at runtime. All the tables are committed under `src/engine/tables/generated`.
- FEN string loading and exporting.
- Packed moves represented as a 32bit value.
- Zobrist hashing for the position.
- Custom trained NNUE architecture model.
- UCI executable
- Search for finding the best move

```ts
import { ChessEngine } from "@drumevp/chess-engine";

const engine = new ChessEngine();
engine.makeUciMove("e2e4");

const result = await engine.findBestMove({
  evaluator: "nnue", // or evalutaor: "simple"
  threads: 4,
  depth: 12,
  moveTimeMs: 1000,
});

console.log(result.uci, result.score);
```

## UCI engine

The library includes a UCI executable.

```bash
npm install @drumevp/chess-engine
./node_modules/.bin/drumevp-chess-engine
```

```bash
npm install --global @drumevp/chess-engine
drumevp-chess-engine
```

```bash
npm run build
./dist/drumevp-chess-engine.js
```

It can also be used programatically with the `UciClient` exported by the library. This also works with any UCI compatible engine. I am using this with stockfish for elo testing.

```ts
import { fileURLToPath } from "node:url";
import { UciClient } from "@drumevp/chess-engine";

const packageEntry = import.meta.resolve("@drumevp/chess-engine");
const enginePath = fileURLToPath(
  new URL("./drumevp-chess-engine.js", packageEntry),
);

const engine = new UciClient(process.execPath, {
  args: [enginePath],
});

await engine.initialize();
await engine.setOption("Evaluator", "nnue");
await engine.setOption("Threads", 2);

const output = await this.sendAndWait("isready");

engine.close();
```

# Perft Performance

I got the node counts and position FEN strings from `https://www.chessprogramming.org/Perft_Results`.

To test depth 5 run `test-perft:deep`. For depth 4 it is `test-perft`.

Small comparison between the perft performance of my movegen vs Chess.js (popular chess library). I am running all the tests on an M1 Pro Macbook Pro. For some more context, I got about 180M nps using stockfish.js wasm (written in C++, I think forked from the official Stockfish repo) on kiwipete depth 5.

The biggest performance gains in this version compared to the `bitboards-bigint` branch are:

- lowering object creation in hot paths while running perft
- switching to 2x32bit values
- Flattening any 2D arrays (lookup tables) is generally faster. So for my lookup tables for `betweenSquares` or `magicAttacks`, this increases performance.
- unfortunately, inlining a lot of code rather than using the existing helper functions. The is primarily for functions such as:
  - forEachBitGetSquare: sequentially selects a bit from the 2x32bit bitboards
  - helpers to encode a move into a packed 32bit move
  - any piece attack generation helper function - knightAttacks, rookAttacks.. etc
    Which makes the codebase very unsightly to read IMO, but I am aiming for maximum performance in the main branch. When generating millions of nodes, function calls that aren't inlined by javascript become a pretty big performance bottleneck.

## My bitboard movegen perft — peak 104.21M/s

Format: `nodes @ time (Million nodes/sec)`

| Pos      |                D1 |                    D2 |                      D3 |                          D4 |                            D5 |
| -------- | ----------------: | --------------------: | ----------------------: | --------------------------: | ----------------------------: |
| Initial  | 20 @ .79ms (0.03) |    400 @ .63ms (0.64) |   8,902 @ 2.38ms (3.74) |   197,281 @ 12.08ms (16.33) |   4,865,609 @ 93.54ms (52.02) |
| Kiwipete | 48 @ .13ms (0.38) |  2,039 @ .24ms (8.50) | 97,862 @ 3.42ms (28.64) | 4,085,603 @ 60.59ms (67.43) |  193,690,690 @ 1.86s (104.21) |
| Pos 3    | 14 @ .02ms (0.77) |   191 @ .01ms (15.38) |   2,812 @ .17ms (16.74) |     43,238 @ 1.53ms (28.27) |     674,624 @ 16.82ms (40.10) |
| Pos 4    |  6 @ .02ms (0.27) |   264 @ .01ms (19.44) |   9,467 @ .21ms (45.51) |    422,333 @ 4.79ms (88.11) | 15,833,292 @ 178.16ms (88.87) |
| Pos 5    | 44 @ .03ms (1.28) | 1,486 @ .03ms (49.40) |  62,379 @ .72ms (86.36) | 2,103,487 @ 22.14ms (95.01) | 89,941,194 @ 912.67ms (98.55) |

## Chess.js perft — peak 1.40M n/s

| Pos      |                D1 |                    D2 |                      D3 |                        D4 |                         D5 |
| -------- | ----------------: | --------------------: | ----------------------: | ------------------------: | -------------------------: |
| Initial  | 20 @ .76ms (0.03) |   400 @ 1.80ms (0.22) |  8,902 @ 25.97ms (0.34) | 197,281 @ 184.49ms (1.07) |   4,865,609 @ 4.15s (1.17) |
| Kiwipete | 48 @ .10ms (0.47) | 2,039 @ 4.27ms (0.48) | 97,862 @ 90.31ms (1.08) |  4,085,603 @ 3.73s (1.10) | 193,690,690 @ 2.85m (1.13) |
| Pos 3    | 14 @ .02ms (0.84) |    191 @ .16ms (1.22) |   2,812 @ 2.22ms (1.27) |   43,238 @ 45.32ms (0.95) |  674,624 @ 597.57ms (1.13) |
| Pos 4    |  6 @ .03ms (0.17) |    264 @ .30ms (0.88) |   9,467 @ 8.05ms (1.18) | 422,333 @ 385.06ms (1.10) | 15,833,292 @ 14.23s (1.11) |
| Pos 5    | 44 @ .04ms (1.14) | 1,486 @ 1.06ms (1.40) | 62,379 @ 61.71ms (1.01) |  2,103,487 @ 1.78s (1.18) |  89,941,194 @ 1.33m (1.13) |

# Custom evaluator architecture and training

The engine includes a custom quantized NNUE evaluator with incremental HalfKA
accumulators and an AssemblyScript/WebAssembly SIMD inference path. The bundled
default checkpoint was trained from the
[Lichess computer-evaluation database](https://database.lichess.org/#evals).

The current model continued from the previous default checkpoint (trained on 20mil positions) and sampled
`100,000,000` additional positions with:

```bash
npm run nnue:train -- \
  --backend tensor \
  --base default \
  --data lichess_data/lichess_db_eval.jsonl.zst \
  --positions 100000000 \
  --validation-positions 500000 \
  --batch-size 1024 \
  --sample-multiplier 2 \
  --shuffle-buffer 500000 \
  --psqt-epochs 0 \
  --network-epochs 1 \
  --feature-epochs 2 \
  --train-reeval-positions 250000 \
  --games-per-elo 64 \
  --elos 1320,1600,2000,2200 \
  --min-promotion-games 128 \
  --log-every 5120000
```

For training from scratch use `--base material`.

See the [NNUE architecture and training guide](./models/nnue/nnue-training.md)
for the full architecture, dataset setup, training stages, validation,
checkpoint promotion, FullThreat training, and all command-line options.

# Elo testing

If you're running the `engine:elo` command to test how the search + evaluator perform, you need stockfish installed locally.
You can run `npx tsx scripts/nnue/prepareStockfish.ts` to clone and install stockfish or install it yourself under `/engines/stockfish`.

Then an example command for elo testing is:

```bash
npm run engine:elo -- \
  --evaluator nnue \
  --games 8 \
  --opponent-elo 2000 \
  --our-threads 2 \
  --enemy-threads 2 \
  --our-movetime 50 \
  --enemy-movetime 50
  --our-depth 20
```

# Branches for bitboard movegen and perft performance

- `bitboard-bigint`: This was my original implementation. Representing every bitboard as a 64bit value as a bigint. This is the cleanest implementation, but the least performant. Kiwipete depth 5 is `10.07M nps`.
- `bitboard-32bit`: I rewrote the bigint engine to use 2x32bit values to represent the 64bit values. The calculations in javascript are much faster this way. The only downside is the codebase is larger and harder to read. Kiwipete depth 5 is `40.96M nps`.
- `master`: This is basically just the `bitboard-32bit` branch, but a lot of the code is inlined, rather than using helper functions. This makes it very ugly to read. I go into more detail here in the Performance section below. Kiwipete depth 5 is `104.21M nps`.

# TODOs:

1. Add incremental zobrist hashing to makeMove
2. Proper documentation and publish example frontend

# ABOUT

All the movegen branches were written by me. Basically everything under src/engine/...

The search, uci and eval (nnue) implenentations were directed by me and covered mostly by Codex using 5.5 Extended Thinking.
