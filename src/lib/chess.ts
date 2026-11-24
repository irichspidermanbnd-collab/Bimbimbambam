export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: Color;
  type: PieceType;
}

export type Square = string; // e.g. 'e4'

export interface ChessState {
  board: (Piece | null)[][]; // [rank 0..7 from rank 8 down to 1][file 0..7 from a to h]
  turn: Color;
  castling: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassant: Square | null;
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  isCapture: boolean;
  isCastle?: 'K' | 'Q';
  isEnPassant?: boolean;
}

export interface MoveResult {
  nextState: ChessState;
  san: string;
  uci: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export function squareToCoords(sq: Square): { r: number; c: number } {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1], 10);
  return { r: 8 - rank, c: file };
}

export function coordsToSquare(r: number, c: number): Square {
  return `${FILES[c]}${8 - r}`;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function parseFen(fen: string): ChessState {
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const turn = (parts[1] === 'b' ? 'b' : 'w') as Color;
  const castlingStr = parts[2] || '-';
  const ep = parts[3] && parts[3] !== '-' ? parts[3] : null;
  const halfmove = parseInt(parts[4] || '0', 10) || 0;
  const fullmove = parseInt(parts[5] || '1', 10) || 1;

  const board: (Piece | null)[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null)
  );

  const rows = placement.split('/');
  for (let r = 0; r < 8 && r < rows.length; r++) {
    let c = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        c += parseInt(ch, 10);
      } else {
        const lower = ch.toLowerCase() as PieceType;
        const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
        if (c < 8) {
          board[r][c] = { color, type: lower };
          c++;
        }
      }
    }
  }

  return {
    board,
    turn,
    castling: {
      wK: castlingStr.includes('K'),
      wQ: castlingStr.includes('Q'),
      bK: castlingStr.includes('k'),
      bQ: castlingStr.includes('q'),
    },
    enPassant: ep,
    halfmove,
    fullmove,
  };
}

export function toFen(state: ChessState): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let rowStr = '';
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) {
        empty++;
      } else {
        if (empty > 0) {
          rowStr += String(empty);
          empty = 0;
        }
        rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
    }
    if (empty > 0) rowStr += String(empty);
    rows.push(rowStr);
  }

  let castlingStr = '';
  if (state.castling.wK) castlingStr += 'K';
  if (state.castling.wQ) castlingStr += 'Q';
  if (state.castling.bK) castlingStr += 'k';
  if (state.castling.bQ) castlingStr += 'q';
  if (!castlingStr) castlingStr = '-';

  return `${rows.join('/')} ${state.turn} ${castlingStr} ${state.enPassant ?? '-'} ${state.halfmove} ${state.fullmove}`;
}

export function isSquareAttacked(
  board: (Piece | null)[][],
  r: number,
  c: number,
  byColor: Color
): boolean {
  // Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  // Knight attacks
  const knightDeltas = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightDeltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = r + dr;
      const kc = c + dc;
      if (inBounds(kr, kc)) {
        const p = board[kr][kc];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }
  }

  // Orthogonal (Rook / Queen)
  const orthoDirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of orthoDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // Diagonal (Bishop / Queen)
  const diagDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

export function findKing(board: (Piece | null)[][], color: Color): { r: number; c: number } | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'k') {
        return { r, c };
      }
    }
  }
  return null;
}

export function isKingInCheck(board: (Piece | null)[][], color: Color): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingPos.r, kingPos.c, enemy);
}

function generatePseudoMovesForSquare(state: ChessState, r: number, c: number): Move[] {
  const piece = state.board[r][c];
  if (!piece || piece.color !== state.turn) return [];

  const moves: Move[] = [];
  const from = coordsToSquare(r, c);
  const enemy: Color = piece.color === 'w' ? 'b' : 'w';

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRank = piece.color === 'w' ? 6 : 1;
    const promoRank = piece.color === 'w' ? 0 : 7;

    // Single push
    if (inBounds(r + dir, c) && !state.board[r + dir][c]) {
      const to = coordsToSquare(r + dir, c);
      if (r + dir === promoRank) {
        for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) {
          moves.push({ from, to, promotion: promo, isCapture: false });
        }
      } else {
        moves.push({ from, to, isCapture: false });
      }

      // Double push
      if (r === startRank && !state.board[r + 2 * dir][c]) {
        moves.push({
          from,
          to: coordsToSquare(r + 2 * dir, c),
          isCapture: false,
        });
      }
    }

    // Captures & En Passant
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = state.board[nr][nc];
      const to = coordsToSquare(nr, nc);

      if (target && target.color === enemy) {
        if (nr === promoRank) {
          for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) {
            moves.push({ from, to, promotion: promo, isCapture: true });
          }
        } else {
          moves.push({ from, to, isCapture: true });
        }
      } else if (state.enPassant && state.enPassant === to) {
        moves.push({ from, to, isCapture: true, isEnPassant: true });
      }
    }
  } else if (piece.type === 'n') {
    const deltas = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = state.board[nr][nc];
      if (!target || target.color === enemy) {
        moves.push({ from, to: coordsToSquare(nr, nc), isCapture: Boolean(target) });
      }
    }
  } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const dirs: number[][] = [];
    if (piece.type === 'b' || piece.type === 'q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === 'r' || piece.type === 'q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = state.board[nr][nc];
        if (!target) {
          moves.push({ from, to: coordsToSquare(nr, nc), isCapture: false });
        } else {
          if (target.color === enemy) {
            moves.push({ from, to: coordsToSquare(nr, nc), isCapture: true });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = state.board[nr][nc];
        if (!target || target.color === enemy) {
          moves.push({ from, to: coordsToSquare(nr, nc), isCapture: Boolean(target) });
        }
      }
    }

    // Castling
    const homeRank = piece.color === 'w' ? 7 : 0;
    if (r === homeRank && c === 4 && !isKingInCheck(state.board, piece.color)) {
      const canK = piece.color === 'w' ? state.castling.wK : state.castling.bK;
      const canQ = piece.color === 'w' ? state.castling.wQ : state.castling.bQ;

      if (
        canK &&
        !state.board[homeRank][5] &&
        !state.board[homeRank][6] &&
        state.board[homeRank][7]?.type === 'r' &&
        state.board[homeRank][7]?.color === piece.color &&
        !isSquareAttacked(state.board, homeRank, 5, enemy) &&
        !isSquareAttacked(state.board, homeRank, 6, enemy)
      ) {
        moves.push({
          from,
          to: coordsToSquare(homeRank, 6),
          isCapture: false,
          isCastle: 'K',
        });
      }

      if (
        canQ &&
        !state.board[homeRank][3] &&
        !state.board[homeRank][2] &&
        !state.board[homeRank][1] &&
        state.board[homeRank][0]?.type === 'r' &&
        state.board[homeRank][0]?.color === piece.color &&
        !isSquareAttacked(state.board, homeRank, 3, enemy) &&
        !isSquareAttacked(state.board, homeRank, 2, enemy)
      ) {
        moves.push({
          from,
          to: coordsToSquare(homeRank, 2),
          isCapture: false,
          isCastle: 'Q',
        });
      }
    }
  }

  return moves;
}

export function applyMoveRaw(state: ChessState, move: Move): ChessState {
  const board = cloneBoard(state.board);
  const { r: fr, c: fc } = squareToCoords(move.from);
  const { r: tr, c: tc } = squareToCoords(move.to);
  const moving = board[fr][fc]!;

  board[fr][fc] = null;

  if (move.isEnPassant) {
    board[fr][tc] = null;
  }

  if (move.isCastle === 'K') {
    board[fr][5] = board[fr][7];
    board[fr][7] = null;
  } else if (move.isCastle === 'Q') {
    board[fr][3] = board[fr][0];
    board[fr][0] = null;
  }

  board[tr][tc] = move.promotion
    ? { color: moving.color, type: move.promotion }
    : { ...moving };

  const castling = { ...state.castling };
  if (moving.type === 'k') {
    if (moving.color === 'w') {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  if (move.from === 'h1' || move.to === 'h1') castling.wK = false;
  if (move.from === 'a1' || move.to === 'a1') castling.wQ = false;
  if (move.from === 'h8' || move.to === 'h8') castling.bK = false;
  if (move.from === 'a8' || move.to === 'a8') castling.bQ = false;

  let enPassant: Square | null = null;
  if (moving.type === 'p' && Math.abs(tr - fr) === 2) {
    enPassant = coordsToSquare((fr + tr) / 2, fc);
  }

  const nextTurn: Color = state.turn === 'w' ? 'b' : 'w';
  return {
    board,
    turn: nextTurn,
    castling,
    enPassant,
    halfmove: moving.type === 'p' || move.isCapture ? 0 : state.halfmove + 1,
    fullmove: state.turn === 'b' ? state.fullmove + 1 : state.fullmove,
  };
}

export function getLegalMoves(state: ChessState, fromSquare?: Square): Move[] {
  const allPseudo: Move[] = [];
  if (fromSquare) {
    const { r, c } = squareToCoords(fromSquare);
    if (inBounds(r, c)) {
      allPseudo.push(...generatePseudoMovesForSquare(state, r, c));
    }
  } else {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        allPseudo.push(...generatePseudoMovesForSquare(state, r, c));
      }
    }
  }

  return allPseudo.filter((m) => {
    const next = applyMoveRaw(state, m);
    return !isKingInCheck(next.board, state.turn);
  });
}

function buildSan(state: ChessState, move: Move, isCheck: boolean, isCheckmate: boolean): string {
  if (move.isCastle === 'K') return `O-O${isCheckmate ? '#' : isCheck ? '+' : ''}`;
  if (move.isCastle === 'Q') return `O-O-O${isCheckmate ? '#' : isCheck ? '+' : ''}`;

  const { r: fr, c: fc } = squareToCoords(move.from);
  const piece = state.board[fr][fc]!;
  let san = '';

  if (piece.type === 'p') {
    if (move.isCapture) {
      san += `${move.from[0]}x`;
    }
    san += move.to;
    if (move.promotion) {
      san += `=${move.promotion.toUpperCase()}`;
    }
  } else {
    san += piece.type.toUpperCase();
    // Disambiguate if another piece of same type can move to same square
    const others = getLegalMoves(state).filter((m) => {
      if (m.to !== move.to || m.from === move.from) return false;
      const { r, c } = squareToCoords(m.from);
      const p = state.board[r][c];
      return p?.type === piece.type && p?.color === piece.color;
    });

    if (others.length > 0) {
      const sameFile = others.some((m) => m.from[0] === move.from[0]);
      const sameRank = others.some((m) => m.from[1] === move.from[1]);
      if (!sameFile) {
        san += move.from[0];
      } else if (!sameRank) {
        san += move.from[1];
      } else {
        san += move.from;
      }
    }

    if (move.isCapture) san += 'x';
    san += move.to;
  }

  if (isCheckmate) san += '#';
  else if (isCheck) san += '+';
  return san;
}

export function makeMove(state: ChessState, move: Move): MoveResult {
  const nextState = applyMoveRaw(state, move);
  const opponentMoves = getLegalMoves(nextState);
  const isCheck = isKingInCheck(nextState.board, nextState.turn);
  const isCheckmate = isCheck && opponentMoves.length === 0;
  const isStalemate = !isCheck && opponentMoves.length === 0;
  const san = buildSan(state, move, isCheck, isCheckmate);
  const uci = `${move.from}${move.to}${move.promotion ?? ''}`;

  return {
    nextState,
    san,
    uci,
    isCheck,
    isCheckmate,
    isStalemate,
  };
}

export function applyUciMove(state: ChessState, uci: string): MoveResult | null {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.length > 4 ? (uci[4] as PieceType) : undefined;
  const legal = getLegalMoves(state, from);
  const found = legal.find(
    (m) => m.to === to && (promo ? m.promotion === promo : !m.promotion || m.promotion === 'q')
  );
  if (!found) return null;
  return makeMove(state, found);
}

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
