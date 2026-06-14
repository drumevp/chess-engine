# Chess movegen ts

A bitboard legal move generator implementation in Typescript. I started this project to learn about bitboards and how to perform bitwise operations. The goal was to achieve decent performance while maintaining full legality. I initially implemented it with `bigint`s, but after some extensive reading and performance tests I pivoted to using 2x32bit values to represent the 64bit values. This makes the codebase a bit uglier and chunkier, but a lot more performant. The original `bigint` implementation is available in the `bitboards-bigint` branch.

# Features
- Interface for generating legal moves, making and undoing moves.
- Tracking for game outcome based on the current position: `checkmate`, `stalemate`, `draw`, `ongoing`. For draw, it handles: `threefold repetition`, `50 halfmove clock draw`, `insufficient material`.
- Custom generator for attack tables, blocker masks, magic bitboards and so on for quick access at runtime. All the tables are committed under `src/engine/tables/generated`. Here I have flattened all tables, as it is quicker to access with 1 index compared to 2D arrays.
- FEN string loading and exporting.
- Packed moves represented as a 32bit value. 
- Zobrist hashing for the position.

# Performance
Small comparison between the perft performance of my movegen vs Chess.js (popular chess library).

## My bitboard movegen perft — peak 86.16M n/s

Format: `nodes @ time (Million nodes/sec)`

| Pos | D1 | D2 | D3 | D4 | D5 |
|---|---:|---:|---:|---:|---:|
| Initial | 20 @ .98ms (0.02) | 400 @ .94ms (0.43) | 8,902 @ 2.82ms (3.15) | 197,281 @ 14.79ms (13.34) | 4,865,609 @ 96.46ms (50.44) |
| Kiwipete | 48 @ .08ms (0.60) | 2,039 @ .32ms (6.37) | 97,862 @ 3.79ms (25.85) | 4,085,603 @ 66.71ms (61.24) | 193,690,690 @ 2.25s (86.16) |
| Pos 3 | 14 @ .03ms (0.43) | 191 @ .02ms (11.24) | 2,812 @ .19ms (14.44) | 43,238 @ 2.34ms (18.45) | 674,624 @ 15.76ms (42.82) |
| Pos 4 | 6 @ .02ms (0.27) | 264 @ .02ms (11.79) | 9,467 @ .26ms (36.79) | 422,333 @ 6.07ms (69.56) | 15,833,292 @ 204.61ms (77.38) |
| Pos 5 | 44 @ .04ms (1.09) | 1,486 @ .03ms (46.15) | 62,379 @ .79ms (78.75) | 2,103,487 @ 25.91ms (81.20) | 89,941,194 @ 1.06s (84.80) |

## Chess.js perft — peak 1.40M n/s

Format: `nodes @ time (Million nodes/sec)`

| Pos | D1 | D2 | D3 | D4 | D5 |
|---|---:|---:|---:|---:|---:|
| Initial | 20 @ .76ms (0.03) | 400 @ 1.80ms (0.22) | 8,902 @ 25.97ms (0.34) | 197,281 @ 184.49ms (1.07) | 4,865,609 @ 4.15s (1.17) |
| Kiwipete | 48 @ .10ms (0.47) | 2,039 @ 4.27ms (0.48) | 97,862 @ 90.31ms (1.08) | 4,085,603 @ 3.73s (1.10) | 193,690,690 @ 2.85m (1.13) |
| Pos 3 | 14 @ .02ms (0.84) | 191 @ .16ms (1.22) | 2,812 @ 2.22ms (1.27) | 43,238 @ 45.32ms (0.95) | 674,624 @ 597.57ms (1.13) |
| Pos 4 | 6 @ .03ms (0.17) | 264 @ .30ms (0.88) | 9,467 @ 8.05ms (1.18) | 422,333 @ 385.06ms (1.10) | 15,833,292 @ 14.23s (1.11) |
| Pos 5 | 44 @ .04ms (1.14) | 1,486 @ 1.06ms (1.40) | 62,379 @ 61.71ms (1.01) | 2,103,487 @ 1.78s (1.18) | 89,941,194 @ 1.33m (1.13) |



# TODOs:
1. Add incremental zobrist hashing to makeMove
2. Add search to find bestmove
3. Implement UCI interface
