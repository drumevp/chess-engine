# Chess movegen ts

A bitboard legal move generator implementation in Typescript. I started this project to learn about bitboards and how to perform bitwise operations. The goal was to achieve decent performance while maintaining full legality. I initially implemented it with `bigint`s, but after some extensive reading and performance tests I pivoted to using 2x32bit values to represent the 64bit values. This makes the codebase a bit uglier and chunkier, but a lot more performant. The original `bigint` implementation is available in the `bitboards-bigint` branch.

# Usage

I am using `node -v` = `v26.1.0`

- `npm install` for dev dependencies. This library doesn't rely on any other dependencies.
- `npm run build`. The perft script points at the generated `dist/index.cjs` file.
- To test perft depth 5 on 5 position from `https://www.chessprogramming.org/Perft_Results`, run `test-perft:deep`. For depth 4 it is `test-perft`.

# Features

- Interface for generating legal moves, making, undoing moves and more. The exported `ChessEngine` has everything to build a fully functional frontend for playing chess. I built myself a demo to test certain positions out.
- Tracking for game outcome based on the current position: `checkmate`, `stalemate`, `draw`, `ongoing`. For draw, it handles: `threefold repetition`, `50 halfmove clock draw`, `insufficient material`. Though the insufficient material handler only determines it is a draw if the position is theoretically impossible to win. If it is theoretically possible, it will not be considered a draw.
- Custom generator for attack tables, blocker masks, magic bitboards and so on for quick access at runtime. All the tables are committed under `src/engine/tables/generated`.
- FEN string loading and exporting.
- Packed moves represented as a 32bit value.
- Zobrist hashing for the position.

# Performance

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

# TODOs:

1. Add incremental zobrist hashing to makeMove
2. Add search to find bestmove
3. Implement UCI interface
