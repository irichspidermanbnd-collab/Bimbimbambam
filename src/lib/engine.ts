import {
  applyMoveRaw,
  ChessState,
  Color,
  getLegalMoves,
  isKingInCheck,
  makeMove,
  Move,
  PieceType,
  squareToCoords,
  toFen,
} from './chess';

export type BotDifficulty = 'club' | 'tactician' | 'master';

export const BOT_LEVELS: Record<
  BotDifficulty,
  { label: string; rating: string; description: string; depth: number; noise: number }
> = {
  club: {
    label: 'Club',
    rating: '900',
    description: 'Develops pieces naturally and spots obvious captures, with occasional tactical slips.',
    depth: 1,
    noise: 75,
  },
  tactician: {
    label: 'Tactician',
    rating: '1350',
    description: 'Protects hanging pieces, plays classic openings, and punishes basic forks and pins.',
    depth: 2,
    noise: 18,
  },
  master: {
    label: 'Master',
    rating: '1750',
    description: 'Calculates 3-ply alpha-beta search with capture resolution and endgame king activity.',
    depth: 3,
    noise: 0,
  },
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (rank 8 at row 0 down to rank 1 at row 7)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 27, 27, 10, 5, 5],
  [0, 0, 0, 24, 24, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -22, -22, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 8, 12, 12, 8, 0, -10],
  [-10, 6, 6, 12, 12, 6, 6, -10],
  [-10, 0, 12, 12, 12, 12, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 6, 0, 0, 0, 0, 6, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [8, 14, 14, 14, 14, 14, 14, 8],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 4, 8, 8, 4, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const KING_END_PST = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

function getPstValue(type: PieceType, color: Color, r: number, c: number, isEndgame: boolean): number {
  const row = color === 'w' ? r : 7 - r;
  switch (type) {
    case 'p':
      return PAWN_PST[row][c];
    case 'n':
      return KNIGHT_PST[row][c];
    case 'b':
      return BISHOP_PST[row][c];
    case 'r':
      return ROOK_PST[row][c];
    case 'q':
      return QUEEN_PST[row][c];
    case 'k':
      return isEndgame ? KING_END_PST[row][c] : KING_MID_PST[row][c];
  }
}

/**
 * Static evaluation in centipawns from White's perspective (+ = White better, - = Black better).
 */
export function evaluateStatic(state: ChessState): number {
  let nonPawnMaterial = 0;
  let wBishops = 0;
  let bBishops = 0;
  const wPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];
  const bPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      if (p.type !== 'p' && p.type !== 'k') {
        nonPawnMaterial += PIECE_VALUES[p.type];
      }
      if (p.type === 'b') {
        if (p.color === 'w') wBishops++;
        else bBishops++;
      }
      if (p.type === 'p') {
        if (p.color === 'w') wPawnFiles[c]++;
        else bPawnFiles[c]++;
      }
    }
  }

  const isEndgame = nonPawnMaterial <= 2600;
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type] + getPstValue(p.type, p.color, r, c, isEndgame);
      score += p.color === 'w' ? val : -val;
    }
  }

  if (wBishops >= 2) score += 30;
  if (bBishops >= 2) score -= 30;

  for (let f = 0; f < 8; f++) {
    if (wPawnFiles[f] > 1) score -= 12 * (wPawnFiles[f] - 1);
    if (bPawnFiles[f] > 1) score += 12 * (bPawnFiles[f] - 1);
  }

  return score;
}

function scoreMoveOrder(state: ChessState, move: Move): number {
  let s = 0;
  if (move.isCapture) {
    const { r: fr, c: fc } = squareToCoords(move.from);
    const { r: tr, c: tc } = squareToCoords(move.to);
    const attacker = state.board[fr][fc];
    const victim = state.board[tr][tc];
    const victimVal = victim ? PIECE_VALUES[victim.type] : 100;
    const attackerVal = attacker ? PIECE_VALUES[attacker.type] : 100;
    s += 10000 + victimVal * 10 - attackerVal;
  }
  if (move.promotion) {
    s += 9000 + PIECE_VALUES[move.promotion];
  }
  if (move.isCastle) s += 400;
  if (move.to === 'e4' || move.to === 'd4' || move.to === 'e5' || move.to === 'd5') s += 45;
  return s;
}

function orderMoves(state: ChessState, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMoveOrder(state, b) - scoreMoveOrder(state, a));
}

function quiescence(state: ChessState, alpha: number, beta: number, maximizing: boolean, qDepth: number): number {
  const standPat = evaluateStatic(state);
  if (qDepth <= 0) return standPat;

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    const captures = orderMoves(
      state,
      getLegalMoves(state).filter((m) => m.isCapture || m.promotion)
    );
    for (const move of captures) {
      const nextState = applyMoveRaw(state, move);
      const score = quiescence(nextState, alpha, beta, false, qDepth - 1);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (beta > standPat) beta = standPat;

    const captures = orderMoves(
      state,
      getLegalMoves(state).filter((m) => m.isCapture || m.promotion)
    );
    for (const move of captures) {
      const nextState = applyMoveRaw(state, move);
      const score = quiescence(nextState, alpha, beta, true, qDepth - 1);
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

function alphabeta(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  plyFromRoot: number
): number {
  const legal = getLegalMoves(state);
  if (legal.length === 0) {
    if (isKingInCheck(state.board, state.turn)) {
      return maximizing ? -99000 + plyFromRoot : 99000 - plyFromRoot;
    }
    return 0; // Stalemate
  }

  if (depth <= 0) {
    return quiescence(state, alpha, beta, maximizing, 1);
  }

  const ordered = orderMoves(state, legal);
  if (maximizing) {
    let best = -Infinity;
    for (const move of ordered) {
      const nextState = applyMoveRaw(state, move);
      const val = alphabeta(nextState, depth - 1, alpha, beta, false, plyFromRoot + 1);
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of ordered) {
      const nextState = applyMoveRaw(state, move);
      const val = alphabeta(nextState, depth - 1, alpha, beta, true, plyFromRoot + 1);
      if (val < best) best = val;
      if (val < beta) beta = val;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// Small opening book (placement-keyed) so bot games feel classical and varied
const OPENING_BOOK: Record<string, string[]> = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': ['d7d5', 'g8f6', 'e7e6'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': ['g1f3', 'f1c4', 'b1c3'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': ['b8c6', 'g8f6'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['f1c4', 'f1b5', 'd2d4'],
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': ['g1f3', 'b1c3', 'c2c3'],
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6': ['c2c4', 'g1f3', 'c1f4'],
};

export interface EngineMoveEvaluation {
  bestMove: Move;
  bestSan: string;
  bestUci: string;
  evalCp: number; // From White's perspective
  mateIn?: number;
}

export function findBestMove(
  state: ChessState,
  depth = 3,
  useBook = false,
  noiseCp = 0
): EngineMoveEvaluation | null {
  const legal = getLegalMoves(state);
  if (legal.length === 0) return null;

  if (useBook) {
    const fenKey = toFen(state).split(' ').slice(0, 4).join(' ');
    const bookUcis = OPENING_BOOK[fenKey];
    if (bookUcis && bookUcis.length > 0) {
      const pick = bookUcis[Math.floor(Math.random() * bookUcis.length)];
      const match = legal.find((m) => `${m.from}${m.to}${m.promotion ?? ''}` === pick);
      if (match) {
        const res = makeMove(state, match);
        return {
          bestMove: match,
          bestSan: res.san,
          bestUci: res.uci,
          evalCp: evaluateStatic(res.nextState),
        };
      }
    }
  }

  const maximizing = state.turn === 'w';
  const ordered = orderMoves(state, legal);

  const scored: { move: Move; rawEval: number; noisyEval: number }[] = [];

  for (const move of ordered) {
    const nextState = applyMoveRaw(state, move);
    const val = alphabeta(nextState, depth - 1, -Infinity, Infinity, !maximizing, 1);
    const jitter = noiseCp > 0 ? (Math.random() * 2 - 1) * noiseCp : 0;
    scored.push({
      move,
      rawEval: val,
      noisyEval: val + jitter,
    });
  }

  scored.sort((a, b) => (maximizing ? b.noisyEval - a.noisyEval : a.noisyEval - b.noisyEval));
  const chosen = scored[0];
  const chosenRes = makeMove(state, chosen.move);

  // Exact best eval (without jitter) for display
  const bestPure = [...scored].sort((a, b) =>
    maximizing ? b.rawEval - a.rawEval : a.rawEval - b.rawEval
  )[0];

  let mateIn: number | undefined;
  if (Math.abs(bestPure.rawEval) > 90000) {
    const plies = 99000 - Math.abs(bestPure.rawEval);
    mateIn = Math.max(1, Math.ceil(plies / 2)) * (bestPure.rawEval > 0 ? 1 : -1);
  }

  return {
    bestMove: chosen.move,
    bestSan: chosenRes.san,
    bestUci: chosenRes.uci,
    evalCp: bestPure.rawEval,
    mateIn,
  };
}

export type MoveClassification = 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';

export interface AnalyzedPly {
  ply: number; // 1-indexed
  moveNumber: number;
  color: Color;
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  mateAfter?: number;
  bestMoveSan: string;
  bestMoveFrom: string;
  bestMoveTo: string;
  cpLoss: number;
  classification: MoveClassification;
  comment: string;
}

export interface GameAnalysisSummary {
  plies: AnalyzedPly[];
  whiteAccuracy: number;
  blackAccuracy: number;
  counts: {
    w: Record<MoveClassification, number>;
    b: Record<MoveClassification, number>;
  };
}

function cpToWinProb(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 1 / (1 + Math.exp(-0.00368208 * clamped));
}

function classifyMove(cpLoss: number, isBestPlayed: boolean): MoveClassification {
  if (isBestPlayed || cpLoss <= 18) return 'Best';
  if (cpLoss <= 50) return 'Good';
  if (cpLoss <= 115) return 'Inaccuracy';
  if (cpLoss <= 240) return 'Mistake';
  return 'Blunder';
}

function buildMoveComment(
  classification: MoveClassification,
  san: string,
  bestSan: string,
  cpLoss: number,
  isCheckmate: boolean,
  isCheck: boolean
): string {
  if (isCheckmate) return `${san} delivers checkmate.`;
  const pawnsLost = (cpLoss / 100).toFixed(1);
  switch (classification) {
    case 'Best':
      return isCheck
        ? `${san} is the engine's top choice, maintaining sharp pressure with check.`
        : `${san} matches the engine's best continuation in the position.`;
    case 'Good':
      return `${san} is a solid, playable move (nearly equal to ${bestSan}).`;
    case 'Inaccuracy':
      return `${san} slightly slips (loses ~${pawnsLost} pawns of advantage). ${bestSan} kept tighter control.`;
    case 'Mistake':
      return `${san} is a mistake, conceding ~${pawnsLost} pawns. ${bestSan} was significantly stronger.`;
    case 'Blunder':
      return `${san} is a serious blunder (-${pawnsLost} pawns). ${bestSan} was required here.`;
  }
}

export function analyzeSinglePly(
  stateBefore: ChessState,
  move: Move,
  plyIndex: number
): { plyData: AnalyzedPly; nextState: ChessState } {
  const engineBefore = findBestMove(stateBefore, 2, false, 0);
  const res = makeMove(stateBefore, move);
  const isBestPlayed = Boolean(engineBefore && engineBefore.bestUci === res.uci);

  let evalAfterCp = engineBefore ? engineBefore.evalCp : 0;
  let mateAfter = engineBefore?.mateIn;

  if (res.isCheckmate) {
    evalAfterCp = stateBefore.turn === 'w' ? 99000 : -99000;
    mateAfter = stateBefore.turn === 'w' ? 1 : -1;
  } else if (res.isStalemate) {
    evalAfterCp = 0;
    mateAfter = undefined;
  } else if (!isBestPlayed) {
    const evalAfterResult = findBestMove(res.nextState, 1, false, 0);
    evalAfterCp = evalAfterResult ? evalAfterResult.evalCp : 0;
    mateAfter = evalAfterResult?.mateIn;
  }

  const evalBeforeCp = engineBefore ? engineBefore.evalCp : evalAfterCp;
  const bestSan = engineBefore ? engineBefore.bestSan : res.san;
  const bestFrom = engineBefore ? engineBefore.bestMove.from : move.from;
  const bestTo = engineBefore ? engineBefore.bestMove.to : move.to;

  const sideSign = stateBefore.turn === 'w' ? 1 : -1;
  // Cap mate scores at +-1500cp for cpLoss calculation so non-mate losses remain sensible
  const cappedBefore = Math.max(-1500, Math.min(1500, evalBeforeCp));
  const cappedAfter = Math.max(-1500, Math.min(1500, evalAfterCp));
  const rawCpLoss = Math.max(0, sideSign * (cappedBefore - cappedAfter));

  const classification = res.isCheckmate
    ? 'Best'
    : classifyMove(rawCpLoss, isBestPlayed);

  const comment = buildMoveComment(
    classification,
    res.san,
    bestSan,
    rawCpLoss,
    res.isCheckmate,
    res.isCheck
  );

  return {
    nextState: res.nextState,
    plyData: {
      ply: plyIndex,
      moveNumber: stateBefore.fullmove,
      color: stateBefore.turn,
      san: res.san,
      uci: res.uci,
      from: move.from,
      to: move.to,
      fenBefore: toFen(stateBefore),
      fenAfter: toFen(res.nextState),
      evalBeforeCp: Math.max(-1500, Math.min(1500, evalBeforeCp)),
      evalAfterCp: Math.max(-1500, Math.min(1500, evalAfterCp)),
      mateAfter,
      bestMoveSan: bestSan,
      bestMoveFrom: bestFrom,
      bestMoveTo: bestTo,
      cpLoss: Math.round(rawCpLoss),
      classification,
      comment,
    },
  };
}

export function computeSummaryStats(plies: AnalyzedPly[]): GameAnalysisSummary {
  const emptyCounts = (): Record<MoveClassification, number> => ({
    Best: 0,
    Good: 0,
    Inaccuracy: 0,
    Mistake: 0,
    Blunder: 0,
  });

  const counts = {
    w: emptyCounts(),
    b: emptyCounts(),
  };

  const winLossW: number[] = [];
  const winLossB: number[] = [];

  for (const p of plies) {
    counts[p.color][p.classification]++;
    const wpBefore = cpToWinProb(p.color === 'w' ? p.evalBeforeCp : -p.evalBeforeCp);
    const wpAfter = cpToWinProb(p.color === 'w' ? p.evalAfterCp : -p.evalAfterCp);
    const lossPct = Math.max(0, (wpBefore - wpAfter) * 100);
    if (p.color === 'w') winLossW.push(lossPct);
    else winLossB.push(lossPct);
  }

  const calcAcc = (losses: number[]) => {
    if (losses.length === 0) return 100;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
    const acc = 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1668;
    return Math.round(Math.max(5, Math.min(100, acc)));
  };

  return {
    plies,
    whiteAccuracy: calcAcc(winLossW),
    blackAccuracy: calcAcc(winLossB),
    counts,
  };
}

export function formatEvalLabel(evalCp: number, mateIn?: number): string {
  if (mateIn !== undefined) {
    return mateIn > 0 ? `M${mateIn}` : `-M${Math.abs(mateIn)}`;
  }
  const pawns = evalCp / 100;
  if (Math.abs(pawns) < 0.05) return '0.0';
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}
