import {
  ChessState,
  getLegalMoves,
  makeMove,
  Move,
  parseFen,
  STARTING_FEN,
} from './chess';

export interface ParsedPgnGame {
  title: string;
  initialFen: string;
  moves: Move[];
  sans: string[];
}

export interface SampleAnalyzedGame {
  id: string;
  title: string;
  subtitle: string;
  pgn: string;
}

export const SAMPLE_GAMES: SampleAnalyzedGame[] = [
  {
    id: 'opera-game',
    title: 'Paul Morphy vs. Allies (Paris, 1858)',
    subtitle: 'Rapid development, open files, and a decisive queen sacrifice',
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#',
  },
  {
    id: 'early-queen-punished',
    title: 'Punishing an Early Queen Attack',
    subtitle: 'How developing with tempo turns 2. Qh5 into a decisive mistake',
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6 5. d3 Nd4 6. Qd1 d5 7. exd5 Nxd5 8. c3 Nc6 9. Nf3 Bg7 10. O-O O-O',
  },
  {
    id: 'fried-liver-trap',
    title: 'Italian Game: Central Fork & Pin',
    subtitle: 'Classic tactical punishment when Black neglects king safety',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Nb4 9. O-O c6 10. d4',
  },
];

function normalizeSanToken(token: string): string {
  return token.replace(/[+#!?]+$/g, '').replace(/0/g, 'O');
}

export function parsePgnMoves(pgnInput: string, customInitialFen = STARTING_FEN): ParsedPgnGame {
  let initialFen = customInitialFen;
  let title = 'Custom Game';

  // Extract optional PGN tags
  const fenMatch = pgnInput.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenMatch?.[1]) {
    initialFen = fenMatch[1];
  }
  const whiteMatch = pgnInput.match(/\[White\s+"([^"]+)"\]/i);
  const blackMatch = pgnInput.match(/\[Black\s+"([^"]+)"\]/i);
  if (whiteMatch?.[1] || blackMatch?.[1]) {
    title = `${whiteMatch?.[1] ?? 'White'} vs. ${blackMatch?.[1] ?? 'Black'}`;
  }

  // Strip PGN headers, comments {...}, variations (...), and move numbers
  const stripped = pgnInput
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');

  const rawTokens = stripped
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, '').trim())
    .filter((t) => t.length > 0 && !/^\d+$/.test(t));

  let state: ChessState = parseFen(initialFen);
  const moves: Move[] = [];
  const sans: string[] = [];

  for (const token of rawTokens) {
    const cleanTarget = normalizeSanToken(token);
    if (!cleanTarget) continue;

    const legal = getLegalMoves(state);
    let matched: Move | undefined;

    for (const m of legal) {
      const res = makeMove(state, m);
      if (normalizeSanToken(res.san) === cleanTarget || res.uci === token) {
        matched = m;
        sans.push(res.san);
        state = res.nextState;
        break;
      }
    }

    if (!matched) {
      throw new Error(`Could not parse move "${token}" at ply ${moves.length + 1}.`);
    }
    moves.push(matched);
  }

  if (moves.length === 0) {
    throw new Error('No valid chess moves found in PGN.');
  }

  return { title, initialFen, moves, sans };
}
