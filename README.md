# Chess bitboard engine

TODOs:

1. DONE - (decided not to add SAN strings here. Simple 'from' 'to' and 'promotionPiece') Create makeMove method that accepts non-encoded (human readable) moves. For squares either use 0-63 or chess coords like a1->a3. This will probably require a cache on analyzePosition or legalMoves
2. DONE --- Implement position to FEN and add as a method.
3. DONE - Add logic for 50 halfmove clock draw, threefold repetition, insufficient material
4. DONE - Create helper fns or methods for generating chess notation:

- DONE - UCI: Universal Chess Interface move format
- don't want to implement SAN helpers yet - SAN: Standard Algebraic Notation

5. DONE - Export piece index constants
6. DONE - Make position and history private so they can't be corrupted
7. DONE - Add more methods:

- DONE - board() -> to get pieceAt Int8Array
- DONE - game state methods (isCheckmate, isStalemate, isCheck, isGameover.....)
