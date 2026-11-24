import { Square } from '../lib/chess';

export type TipCategory = 'openings' | 'tactics' | 'endgames';
export type TipLevel = 'Foundations' | 'Intermediate' | 'Advanced';

export interface SquareHighlight {
  square: Square;
  tone: 'primary' | 'amber' | 'neutral';
}

export interface BoardArrow {
  from: Square;
  to: Square;
  tone?: 'primary' | 'amber';
}

export interface TipStep {
  uci?: string; // Omit on step 0 (intro position)
  san?: string;
  label: string;
  explanation: string;
  highlights?: SquareHighlight[];
  arrows?: BoardArrow[];
}

export interface TipDrill {
  prompt: string;
  fen: string;
  acceptedUcis: string[];
  solutionSan: string;
  hint: string;
  successNote: string;
}

export interface ChessTip {
  id: string;
  number: string;
  category: TipCategory;
  level: TipLevel;
  readMinutes: number;
  title: string;
  subtitle: string;
  summary: string;
  orientation: 'w' | 'b';
  initialFen: string;
  steps: TipStep[];
  drill: TipDrill;
  checklist: string[];
  commonMistake: {
    title: string;
    detail: string;
  };
}

export const CATEGORY_META: Record<
  TipCategory,
  { label: string; headline: string; intro: string; image: string; imageAlt: string }
> = {
  openings: {
    label: 'Openings',
    headline: 'Openings & Development',
    intro:
      'Build harmonious positions out of the starting gate without memorizing twenty-move computer lines. Every opening rule serves three goals: central influence, rapid piece activity, and a safe king.',
    image: '/src/assets/images/editorial_openings_board_1795487743435.jpg',
    imageAlt: 'Wooden Staunton knights and pawns positioned in the center of a walnut chessboard',
  },
  tactics: {
    label: 'Tactics',
    headline: 'Tactical Patterns',
    intro:
      'Strategy creates the conditions, but tactics decide the score. Master the recurring geometric motifs—forks, pins, skewers, and discovered checks—until you spot them before your opponent does.',
    image: '/src/assets/images/editorial_tactics_knight_1795487745499.jpg',
    imageAlt: 'Carved wooden knight and bishop angled across dark and light chessboard squares',
  },
  endgames: {
    label: 'Endgames',
    headline: 'Endgame Essentials',
    intro:
      'When the queens leave the board, every tempo and single square carries decisive weight. Learn the exact geometry of king opposition, passed pawns, and active rook placement.',
    image: '/src/assets/images/editorial_endgames_king_1795487744748.jpg',
    imageAlt: 'Dark wooden king facing a lone light pawn on an open chessboard',
  },
};

export const CHESS_TIPS: ChessTip[] = [
  {
    id: 'control-the-center',
    number: '01',
    category: 'openings',
    level: 'Foundations',
    readMinutes: 4,
    title: 'Stake a Claim in the Center Immediately',
    subtitle: 'Why e4, d4, e5, and d5 dictate the mobility of every piece on the board',
    summary:
      'Pieces placed on or aimed toward the four central squares control twice as many diagonals and ranks as pieces tucked on the rim. Contest the center on move one so your bishops and knights enter with maximum reach.',
    orientation: 'w',
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    steps: [
      {
        label: 'Initial Position',
        explanation:
          'Notice the four central squares—d4, d5, e4, and e5. Every minor piece gains maximum range when it points directly into this zone.',
        highlights: [
          { square: 'd4', tone: 'primary' },
          { square: 'e4', tone: 'primary' },
          { square: 'd5', tone: 'primary' },
          { square: 'e5', tone: 'primary' },
        ],
      },
      {
        uci: 'e2e4',
        san: 'e4',
        label: '1. e4 — Occupy and Open Lines',
        explanation:
          'Advancing the king pawn occupies e4, clamps down on d5 and f5, and immediately opens diagonals for both the light-squared bishop and the queen.',
        highlights: [
          { square: 'e4', tone: 'primary' },
          { square: 'd5', tone: 'amber' },
          { square: 'f5', tone: 'amber' },
        ],
        arrows: [{ from: 'f1', to: 'c4', tone: 'primary' }],
      },
      {
        uci: 'e7e5',
        san: 'e5',
        label: '1... e5 — Equal Share',
        explanation:
          'Black answers symmetrically to stop White from playing d4 uncontested and opens lines for Black’s dark-squared bishop.',
        highlights: [
          { square: 'e5', tone: 'primary' },
          { square: 'd4', tone: 'amber' },
        ],
      },
      {
        uci: 'g1f3',
        san: 'Nf3',
        label: '2. Nf3 — Develop With Purpose',
        explanation:
          'The knight leaps toward the center, covering d4 and e5 while simultaneously attacking Black’s undefended e5-pawn.',
        arrows: [
          { from: 'f3', to: 'e5', tone: 'amber' },
          { from: 'f3', to: 'd4', tone: 'primary' },
        ],
      },
      {
        uci: 'b8c6',
        san: 'Nc6',
        label: '2... Nc6 — Defend and Develop',
        explanation:
          'Black defends e5 not with a passive pawn move like d6, which blocks the f8-bishop, but with a developing knight move toward the center.',
        arrows: [{ from: 'c6', to: 'e5', tone: 'primary' }],
      },
      {
        uci: 'f1c4',
        san: 'Bc4',
        label: '3. Bc4 — Aim at the Weakest Square',
        explanation:
          'The bishop enters the game pointing straight through d5 toward f7—the only pawn near Black’s king defended solely by the king itself.',
        arrows: [{ from: 'c4', to: 'f7', tone: 'amber' }],
      },
    ],
    drill: {
      prompt: 'White to move. Develop a minor piece that eyes the center and pressures Black’s camp.',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      acceptedUcis: ['f1c4', 'f1b5', 'b1c3'],
      solutionSan: 'Bc4 (or Bb5)',
      hint: 'Bring your kingside bishop out toward c4 or b5 so you prepare to castle next.',
      successNote: 'Active development! You claim central influence and clear the path for castling.',
    },
    checklist: [
      'Put at least one pawn in the center (e4 or d4) on moves 1–2.',
      'Defend threatened pawns with developing moves (Nc6, Nf6) whenever possible.',
      'Aim bishops along open diagonals toward d5/f7 or e5/c7.',
    ],
    commonMistake: {
      title: 'Pushing Flank Pawns (a3, h3) Too Early',
      detail:
        'Unnecessary rook-pawn pushes spend a vital tempo without fighting for d4, d5, e4, or e5, letting your opponent seize the initiative.',
    },
  },
  {
    id: 'knights-before-bishops',
    number: '02',
    category: 'openings',
    level: 'Foundations',
    readMinutes: 3,
    title: 'Develop Knights Before Bishops',
    subtitle: 'Commit your short-range pieces to their natural posts before choosing bishop diagonals',
    summary:
      'Knights almost always belong on f3 and c3 (or f6 and c6). Bishops, by contrast, are long-range pieces whose best square—c4, b5, e2, or g5—depends on how your opponent responds.',
    orientation: 'w',
    initialFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    steps: [
      {
        label: 'Why Knights Commit First',
        explanation:
          'After 1. e4, a knight on f3 or c3 reaches into the center from its single best square. Waiting to place the bishop keeps your options flexible.',
        highlights: [
          { square: 'f3', tone: 'primary' },
          { square: 'c3', tone: 'primary' },
        ],
      },
      {
        uci: 'e7e5',
        san: 'e5',
        label: '1... e5',
        explanation: 'Black claims an equal share of central space.',
      },
      {
        uci: 'g1f3',
        san: 'Nf3',
        label: '2. Nf3 — Natural Square First',
        explanation:
          'Notice White develops the knight before touching either bishop, gaining time by attacking e5.',
        arrows: [{ from: 'f3', to: 'e5', tone: 'amber' }],
      },
      {
        uci: 'b8c6',
        san: 'Nc6',
        label: '2... Nc6',
        explanation:
          'Black responds with the knight too. Now that c6 is occupied, White knows exactly where the f1-bishop has maximum impact.',
      },
      {
        uci: 'f1b5',
        san: 'Bb5',
        label: '3. Bb5 — Informed Bishop Placement',
        explanation:
          'Had Black played 2... Nf6 instead of 2... Nc6, Bb5 would hit thin air. Developing the knight first let White wait and pick the strongest diagonal.',
        arrows: [{ from: 'b5', to: 'c6', tone: 'primary' }],
      },
    ],
    drill: {
      prompt: 'White to move in the Queen’s Gambit. Develop a knight before committing either bishop.',
      fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
      acceptedUcis: ['b1c3', 'g1f3'],
      solutionSan: 'Nc3 (or Nf3)',
      hint: 'Both c3 and f3 increase pressure on d5 without prematurely locking in your bishops.',
      successNote: 'Clean discipline—your knight increases central pressure while keeping bishop flexibility.',
    },
    checklist: [
      'Place knights on f3/c3 (f6/c6) unless pawn structure demands Nbd2 or c4 first.',
      'Hold off moving a bishop until it clearly targets an opponent weakness or prepares castling.',
      'Never block your c-pawn with Nc3 in Queen’s Pawn openings if you still want c4.',
    ],
    commonMistake: {
      title: 'Bringing Out a Bishop Only to Retreat It',
      detail:
        'Playing Bb5 before Black plays Nc6—or Bc4 before checking for ...d5 counterstrikes—often forces you to move the same bishop twice.',
    },
  },
  {
    id: 'castle-early',
    number: '03',
    category: 'openings',
    level: 'Intermediate',
    readMinutes: 4,
    title: 'Castle Early Before Opening the Center',
    subtitle: 'Tuck your king behind intact pawns and connect your rooks toward the e- and d-files',
    summary:
      'An uncastled king on e1 or e8 acts like a magnet for checks along open central files. Complete kingside castling within the first seven moves before launching pawn breaks.',
    orientation: 'w',
    initialFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 5',
    steps: [
      {
        label: 'Both Kings Still Vulnerable',
        explanation:
          'Both sides have developed minor pieces, yet neither king has castled. Whoever castles first can safely pry open the center with d4 or f4.',
        highlights: [
          { square: 'e1', tone: 'amber' },
          { square: 'g1', tone: 'primary' },
        ],
      },
      {
        uci: 'e1g1',
        san: 'O-O',
        label: '5. O-O — Two Goals in One Move',
        explanation:
          'Castling shelters the White king behind f2, g2, and h2 while swinging the h1-rook toward the central files in a single tempo.',
        highlights: [
          { square: 'g1', tone: 'primary' },
          { square: 'f1', tone: 'primary' },
        ],
      },
      {
        uci: 'd7d6',
        san: 'd6',
        label: '5... d6 — Delaying King Safety',
        explanation:
          'Black opens the c8-bishop instead of castling immediately—now White can seize the initiative along the kingside pin.',
      },
      {
        uci: 'c1g5',
        san: 'Bg5',
        label: '6. Bg5 — Pinning With a Safe King',
        explanation:
          'With the king already secure on g1, White activates the last minor piece and creates an uncomfortable pin on f6.',
        arrows: [{ from: 'g5', to: 'd8', tone: 'amber' }],
      },
    ],
    drill: {
      prompt: 'White to move. Secure your king and activate your rook in one move.',
      fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5',
      acceptedUcis: ['e1g1'],
      solutionSan: 'O-O',
      hint: 'Move your king two squares toward the h1-rook.',
      successNote: 'King safety secured. Notice how f1 is now ready to contest the center via Re1.',
    },
    checklist: [
      'Clear the f1 and g1 squares early so O-O is available whenever tension rises.',
      'Avoid pushing the f-, g-, or h-pawns in front of your castled king without concrete reason.',
      'Attack an uncastled opponent by opening central files (e4-e5 or d4-d5).',
    ],
    commonMistake: {
      title: 'Attacking While Your Own King Sits on e1',
      detail:
        'Pawn grabs or flank raids before castling often backfire when the opponent strikes the center and pins pieces to your exposed king.',
    },
  },
  {
    id: 'punish-early-queen',
    number: '04',
    category: 'openings',
    level: 'Foundations',
    readMinutes: 4,
    title: 'Develop Against an Early Queen Raid',
    subtitle: 'Turn your opponent’s premature queen sortie into free developing tempos',
    summary:
      'Because the queen is worth nine points, it must flee whenever attacked by a pawn or minor piece. Never panic against 2. Qh5—defend threats with normal developing moves that force the queen to retreat.',
    orientation: 'b',
    initialFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    steps: [
      {
        label: 'Setting the Stage',
        explanation:
          'Many club games begin with White eyeing f7 early using the queen. Watch how Black neutralizes every threat while gaining a massive lead in development.',
      },
      {
        uci: 'e7e5',
        san: 'e5',
        label: '1... e5',
        explanation: 'Black occupies the center cleanly.',
      },
      {
        uci: 'd1h5',
        san: 'Qh5',
        label: '2. Qh5 — Premature Queen Sortie',
        explanation:
          'White threatens both Qxe5+ and Bc4 followed by Qxf7#. The key is to defend e5 first without weakening the kingside.',
        arrows: [{ from: 'h5', to: 'e5', tone: 'amber' }],
      },
      {
        uci: 'b8c6',
        san: 'Nc6',
        label: '2... Nc6 — Defend While Developing',
        explanation:
          'Black protects e5 and brings a knight into the game. Playing 2... g6?? here would be a blunder because of 3. Qxe5+, forking king and rook!',
        arrows: [{ from: 'c6', to: 'e5', tone: 'primary' }],
      },
      {
        uci: 'f1c4',
        san: 'Bc4',
        label: '3. Bc4 — Scholar’s Mate Threat',
        explanation: 'Now White threatens Qxf7#.',
        arrows: [{ from: 'c4', to: 'f7', tone: 'amber' }],
      },
      {
        uci: 'g7g6',
        san: 'g6',
        label: '3... g6 — Block Mate and Gain Tempo',
        explanation:
          'Now that e5 is protected by Nc6, ...g6 safely blocks the queen’s path to f7 and forces the queen to move again.',
        highlights: [{ square: 'g6', tone: 'primary' }],
      },
      {
        uci: 'h5f3',
        san: 'Qf3',
        label: '4. Qf3 — Still Threatening f7',
        explanation: 'White keeps pressure on f7 along the f-file.',
      },
      {
        uci: 'g8f6',
        san: 'Nf6',
        label: '4... Nf6 — Complete Immunity & Lead',
        explanation:
          'Black blocks the f-file, develops a second knight, prepares ...Nd4 or ...Bg7, and stands clearly better.',
        highlights: [
          { square: 'c6', tone: 'primary' },
          { square: 'f6', tone: 'primary' },
        ],
      },
    ],
    drill: {
      prompt: 'Black to move. White threatens Qxf7#. Neutralize mate and chase the queen.',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 4 3',
      acceptedUcis: ['g7g6'],
      solutionSan: 'g6',
      hint: 'Now that e5 is defended by Nc6, advance a pawn that blocks the queen and attacks her.',
      successNote: 'Correct! Because e5 is guarded, ...g6 stops checkmate and forces the queen to retreat.',
    },
    checklist: [
      'Check what the queen attacks (usually e5 and f7) before reacting.',
      'Defend pawns with knights (Nc6) before touching g6 or g3.',
      'Count how many minor pieces you have out—use each tempo to attack the queen.',
    ],
    commonMistake: {
      title: 'Playing 2... g6 Before Defending e5',
      detail:
        'After 1. e4 e5 2. Qh5 g6??, White plays 3. Qxe5+ and wins the h8-rook with a fork.',
    },
  },
  {
    id: 'knight-fork',
    number: '05',
    category: 'tactics',
    level: 'Foundations',
    readMinutes: 4,
    title: 'Spot the Knight Fork From Two Squares Away',
    subtitle: 'Knights attack two pieces simultaneously without sharing any line with their targets',
    summary:
      'Unlike bishops or rooks, a knight’s fork cannot be blocked by interposing another piece. Always scan for enemy kings, queens, and rooks sitting on the same color complex two squares apart.',
    orientation: 'w',
    initialFen: 'r3k2r/ppp2ppp/2n2n2/3Np3/4P3/8/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    steps: [
      {
        label: 'Scanning for Same-Color Targets',
        explanation:
          'Look at the Black king on e8 and the Black rook on a8—both sit on light squares. A knight landing on c7 attacks both at once.',
        highlights: [
          { square: 'e8', tone: 'amber' },
          { square: 'a8', tone: 'amber' },
          { square: 'c7', tone: 'primary' },
        ],
      },
      {
        uci: 'd5c7',
        san: 'Nxc7+',
        label: '1. Nxc7+ — The Fork',
        explanation:
          'White captures on c7 with check. Because a knight jump cannot be blocked, the Black king must move, leaving the a8-rook undefended.',
        arrows: [
          { from: 'c7', to: 'e8', tone: 'amber' },
          { from: 'c7', to: 'a8', tone: 'primary' },
        ],
      },
      {
        uci: 'e8d8',
        san: 'Kd8',
        label: '1... Kd8',
        explanation: 'The king steps out of check.',
      },
      {
        uci: 'c7a8',
        san: 'Nxa8',
        label: '2. Nxa8 — Material Won',
        explanation: 'White pockets a full rook and an extra pawn cleanly.',
      },
    ],
    drill: {
      prompt: 'White to move. Find the fork that wins material with check.',
      fen: 'r3k2r/ppp2ppp/2n2n2/3Np3/4P3/8/PPPP1PPP/R1BQK2R w KQkq - 0 1',
      acceptedUcis: ['d5c7'],
      solutionSan: 'Nxc7+',
      hint: 'Your knight on d5 is only one jump away from attacking both the king and a rook.',
      successNote: 'Clean knight fork! Checking the king leaves the corner rook completely helpless.',
    },
    checklist: [
      'Whenever a knight reaches the 5th or 6th rank, check c7/f7 (or c2/f2) immediately.',
      'Remember a knight always lands on the opposite color square from where it started.',
      'Check if an opponent piece defending the fork square is overloaded or undefended.',
    ],
    commonMistake: {
      title: 'Overlooking Backward Knight Captures',
      detail:
        'Players calculate forward knight jumps naturally, yet routinely miss defensive or winning knight retreats back toward the 1st/2nd rank.',
    },
  },
  {
    id: 'pin-and-pile',
    number: '06',
    category: 'tactics',
    level: 'Foundations',
    readMinutes: 5,
    title: 'Pin a Defender, Then Attack It Again',
    subtitle: 'A pinned piece cannot move—so adding one more attacker wins it by force',
    summary:
      'A pin by itself is merely pressure. It turns into winning material the moment you pile a second attacker—especially a humble pawn or knight—onto the immobilized piece.',
    orientation: 'w',
    initialFen: 'r1bq1rk1/ppp2ppp/3p1n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 7',
    steps: [
      {
        label: 'The Relative Pin on f6',
        explanation:
          'White’s g5-bishop pins Black’s f6-knight against the Black queen on d8. Right now f6 is defended by the g7-pawn, so Bg5xf6 isn’t winning yet.',
        arrows: [{ from: 'g5', to: 'd8', tone: 'amber' }],
        highlights: [{ square: 'f6', tone: 'amber' }],
      },
      {
        uci: 'c3d5',
        san: 'Nd5!',
        label: '1. Nd5! — Pile On the Pinned Piece',
        explanation:
          'White brings a second attacker to f6. Black cannot relieve the pressure by moving the f6-knight without exposing the queen on d8.',
        arrows: [{ from: 'd5', to: 'f6', tone: 'primary' }],
      },
      {
        uci: 'f6d5',
        san: 'Nxd5',
        label: '1... Nxd5?',
        explanation:
          'If Black tries to trade off the dangerous knight on d5, the pin snaps.',
      },
      {
        uci: 'g5d8',
        san: 'Bxd8',
        label: '2. Bxd8 — Queen Captured',
        explanation: 'White’s bishop slices right down the diagonal to capture the Black queen.',
      },
    ],
    drill: {
      prompt: 'White to move. Exploit the pin on f6 by adding a second attacker to the knight.',
      fen: 'r1bq1rk1/ppp2ppp/3p1n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 7',
      acceptedUcis: ['c3d5'],
      solutionSan: 'Nd5',
      hint: 'Jump your queenside knight forward so it eyes f6.',
      successNote: 'Textbook "PP" rule: Put Pressure on the Pinned Piece!',
    },
    checklist: [
      'Distinguish absolute pins (against the king, illegal to move) from relative pins (against the queen/rook).',
      'Once an enemy piece is pinned, look for pawn pushes (e5/d5) or knight jumps to attack it a second time.',
      'Break pins against your own pieces promptly with moves like Be7, h6, or unpinning the queen.',
    ],
    commonMistake: {
      title: 'Cashing In a Pin Too Early',
      detail:
        'Trading Bxf6 before adding another attacker often just helps the opponent recapture with their queen or straighten out pawns.',
    },
  },
  {
    id: 'skewer-tactic',
    number: '07',
    category: 'tactics',
    level: 'Intermediate',
    readMinutes: 4,
    title: 'Use the Skewer When High-Value Pieces Align',
    subtitle: 'Force the more valuable piece to step aside and claim what stands behind it',
    summary:
      'A skewer is a pin in reverse: the higher-value piece sits in front of a lesser (or undefended) target on the same rank, file, or diagonal. When the front piece moves out of danger, the rear target falls.',
    orientation: 'w',
    initialFen: 'r7/1p3ppp/8/k7/8/8/5PPP/1R4K1 w - - 0 1',
    steps: [
      {
        label: 'Alignment on the a-File',
        explanation:
          'Notice Black’s king on a5 and Black’s rook on a8 sit on the same file. White’s rook on b1 is one tempo away from turning that geometry into a decisive skewer.',
        highlights: [
          { square: 'a5', tone: 'amber' },
          { square: 'a8', tone: 'amber' },
        ],
      },
      {
        uci: 'b1a1',
        san: 'Ra1+',
        label: '1. Ra1+ — Checking Through the King',
        explanation:
          'White checks the king along the a-file. The king cannot stay on the file, and the a8-rook cannot interpose.',
        arrows: [{ from: 'a1', to: 'a8', tone: 'primary' }],
      },
      {
        uci: 'a5b5',
        san: 'Kb5',
        label: '1... Kb5 — King Steps Aside',
        explanation: 'The Black king must vacate the a-file, abandoning its rook.',
      },
      {
        uci: 'a1a8',
        san: 'Rxa8',
        label: '2. Rxa8 — Clean Capture',
        explanation: 'White wins the rook and easily converts the endgame.',
      },
    ],
    drill: {
      prompt: 'White to move. Win Black’s rook using a skewer.',
      fen: 'r7/1p3ppp/8/k7/8/8/5PPP/1R4K1 w - - 0 1',
      acceptedUcis: ['b1a1'],
      solutionSan: 'Ra1+',
      hint: 'Check the Black king along the file where its rook sits behind it.',
      successNote: 'Bullseye! Checking along the a-file forces the king away from the a8-rook.',
    },
    checklist: [
      'Look for enemy king + queen or king + rook aligned on open files or long diagonals.',
      'Check if a skewer works immediately as a check—checks leave zero time for counterplay.',
      'Keep your own king and queen off the same diagonal or rank when an enemy bishop or rook is active.',
    ],
    commonMistake: {
      title: 'Giving a Skewer Without Checking Protection',
      detail:
        'Before skewering a queen and rook, verify that the rear rook isn’t defended—or that the front piece can’t retreat while guarding the piece behind it.',
    },
  },
  {
    id: 'discovered-double-check',
    number: '08',
    category: 'tactics',
    level: 'Advanced',
    readMinutes: 5,
    title: 'Unleash Discovered & Double Checks',
    subtitle: 'When two pieces deliver check at once, the enemy king has no choice but to run',
    summary:
      'A discovered attack happens when moving one piece uncovers an attack from a piece behind it. If both the moving piece and the uncovered piece deliver check simultaneously, capturing or blocking is illegal—only a king move can respond.',
    orientation: 'w',
    initialFen: '4k3/5ppp/8/8/r3B3/8/5PPP/4R1K1 w - - 0 1',
    steps: [
      {
        label: 'Loaded Battery on the e-File',
        explanation:
          'White’s rook on e1 stares directly at Black’s king on e8, separated only by White’s own bishop on e4. Where can the bishop move to deliver a second check while attacking Black’s rook on a4?',
        arrows: [{ from: 'e1', to: 'e8', tone: 'primary' }],
        highlights: [{ square: 'a4', tone: 'amber' }],
      },
      {
        uci: 'e4c6',
        san: 'Bc6++',
        label: '1. Bc6+ — Double Check & Attack',
        explanation:
          'The bishop leaps to c6: both the bishop (c6-e8) and the rook (e1-e8) check the Black king at the exact same instant, while the bishop also aims down the diagonal at the rook on a4.',
        arrows: [
          { from: 'c6', to: 'e8', tone: 'amber' },
          { from: 'c6', to: 'a4', tone: 'primary' },
        ],
      },
      {
        uci: 'e8f8',
        san: 'Kf8',
        label: '1... Kf8 — Forced King Move',
        explanation:
          'Black cannot block both checks or capture the bishop—only moving the king is legal.',
      },
      {
        uci: 'c6a4',
        san: 'Bxa4',
        label: '2. Bxa4 — Rook Captured',
        explanation: 'White scoops up the rook effortlessly.',
      },
    ],
    drill: {
      prompt: 'White to move. Deliver a double check that wins Black’s rook.',
      fen: '4k3/5ppp/8/8/r3B3/8/5PPP/4R1K1 w - - 0 1',
      acceptedUcis: ['e4c6'],
      solutionSan: 'Bc6+',
      hint: 'Move the e4-bishop to a square that checks e8 and hits the a4-rook simultaneously.',
      successNote: 'Devastating double check! In double check, the king must move—no capture or block is legal.',
    },
    checklist: [
      'Align rooks or queens opposite the enemy king or queen, even when pieces stand in between.',
      'Test every check your blocking piece can give—double checks are practically unstoppable.',
      'If your king sits opposite an enemy rook behind minor pieces, step off the file proactively.',
    ],
    commonMistake: {
      title: 'Missing That a Moving Piece Can Capture With Check',
      detail:
        'Players often evaluate normal discovered attacks and forget that the front piece can jump aggressively into a defended square if it creates a double check.',
    },
  },
  {
    id: 'rule-of-the-square',
    number: '09',
    category: 'endgames',
    level: 'Foundations',
    readMinutes: 4,
    title: 'Calculate Pawn Races Instantly With the Square',
    subtitle: 'Know whether a lone king catches a runaway passed pawn without counting every move',
    summary:
      'Draw an imaginary square from the passed pawn to its promotion square. If the defending king steps inside that square on its turn, it catches the pawn; if it remains outside, the pawn promotes.',
    orientation: 'w',
    initialFen: '8/8/8/2k5/7P/8/8/6K1 w - - 0 1',
    steps: [
      {
        label: 'Visualizing the Square',
        explanation:
          'White’s pawn on h4 is 4 squares from h8. Its square spans h4–h8–d8–d4. Black’s king on c5 stands just one file outside the boundary—meaning White to move wins the race!',
        highlights: [
          { square: 'h4', tone: 'primary' },
          { square: 'h8', tone: 'primary' },
          { square: 'd8', tone: 'neutral' },
          { square: 'd4', tone: 'neutral' },
          { square: 'c5', tone: 'amber' },
        ],
      },
      {
        uci: 'h4h5',
        san: 'h5!',
        label: '1. h5! — Shrink the Square',
        explanation:
          'Advancing the pawn immediately shrinks the square to h5–h8–e8–e5. Black’s king stays one step behind.',
        highlights: [
          { square: 'h5', tone: 'primary' },
          { square: 'e5', tone: 'neutral' },
        ],
      },
      {
        uci: 'c5d6',
        san: 'Kd6',
        label: '1... Kd6',
        explanation: 'Black chases diagonally, yet remains outside the new e5–h8 square.',
      },
      {
        uci: 'h5h6',
        san: 'h6',
        label: '2. h6',
        explanation: 'Now the square shrinks to f6–h8. Black cannot catch up.',
      },
      {
        uci: 'd6e7',
        san: 'Ke7',
        label: '2... Ke7',
        explanation: 'Black sprints toward the promotion corner.',
      },
      {
        uci: 'h6h7',
        san: 'h7',
        label: '3. h7',
        explanation: 'One square left.',
      },
      {
        uci: 'e7f7',
        san: 'Kf7',
        label: '3... Kf7',
        explanation: 'Black reaches f7—still one move too late.',
      },
      {
        uci: 'h7h8q',
        san: 'h8=Q',
        label: '4. h8=Q — Queen Promotes',
        explanation:
          'White promotes cleanly. Notice that if it had been Black to move on turn 1, 1... Kd5 would have entered the square and drawn.',
      },
    ],
    drill: {
      prompt: 'White to move. Make the only move that keeps Black’s king outside the pawn’s square.',
      fen: '8/8/8/2k5/7P/8/8/6K1 w - - 0 1',
      acceptedUcis: ['h4h5'],
      solutionSan: 'h5',
      hint: 'Don’t move your king—push the pawn immediately before Black steps onto the d-file.',
      successNote: 'Precise calculation! Pushing h5 shrinks the square out of Black’s reach.',
    },
    checklist: [
      'Remember a pawn on the 2nd rank moves two squares on its first step—measure the square from the 3rd rank.',
      'Check if your own king or obstacle blocks the pawn’s path before relying on the square.',
      'If a pawn race looks close, push immediately rather than making passive king moves.',
    ],
    commonMistake: {
      title: 'Forgetting the Double-Step From the 2nd Rank',
      detail:
        'A pawn starting on h2 can leap straight to h4, making its effective square smaller than a 6-square count suggests.',
    },
  },
  {
    id: 'king-opposition',
    number: '10',
    category: 'endgames',
    level: 'Intermediate',
    readMinutes: 5,
    title: 'Seize the Opposition to Force Promotion',
    subtitle: 'In king-and-pawn endgames, whoever forces the enemy king to step aside wins',
    summary:
      'When two kings face each other with one empty square between them, the player NOT to move holds the opposition—forcing the opponent to yield key squares ahead of the pawn.',
    orientation: 'w',
    initialFen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
    steps: [
      {
        label: 'Keep the King Ahead of the Pawn',
        explanation:
          'White’s king is rightly ahead of the e4-pawn. To escort the pawn to e8, White must take direct opposition against Black’s king.',
        highlights: [
          { square: 'e6', tone: 'primary' },
          { square: 'e8', tone: 'amber' },
        ],
      },
      {
        uci: 'e5e6',
        san: 'Ke6!',
        label: '1. Ke6! — Direct Opposition',
        explanation:
          'White steps onto e6, leaving one square (e7) between the kings with Black to move. Black must abandon either d7 or f7.',
        highlights: [
          { square: 'e6', tone: 'primary' },
          { square: 'e7', tone: 'neutral' },
          { square: 'e8', tone: 'amber' },
        ],
      },
      {
        uci: 'e8d8',
        san: 'Kd8',
        label: '1... Kd8 — Forced to Yield',
        explanation: 'Black steps left, opening the f7-square on the opposite flank.',
      },
      {
        uci: 'e6f7',
        san: 'Kf7!',
        label: '2. Kf7! — Outflanking to the 7th Rank',
        explanation:
          'White’s king steps forward to f7, directly guarding the promotion square e8. The game is now completely won.',
        highlights: [
          { square: 'f7', tone: 'primary' },
          { square: 'e8', tone: 'primary' },
        ],
      },
      {
        uci: 'd8d7',
        san: 'Kd7',
        label: '2... Kd7',
        explanation: 'Black tries to stay close, but cannot stop e5–e6–e7–e8.',
      },
      {
        uci: 'e4e5',
        san: 'e5',
        label: '3. e5 — Clear Path to Queen',
        explanation: 'With the king controlling e8 from f7, the pawn marches home unopposed.',
      },
    ],
    drill: {
      prompt: 'White to move. Take the direct opposition so Black’s king must step aside.',
      fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
      acceptedUcis: ['e5e6'],
      solutionSan: 'Ke6',
      hint: 'Step directly in front of the Black king with one square between you.',
      successNote: 'Opposition secured! Whichever way Black steps, your king outflanks onto f7 or d7.',
    },
    checklist: [
      'Always lead with your king ahead of your pawn whenever possible.',
      'Take direct opposition (1 square apart) so the opponent has to move first.',
      'Reach the 6th rank with your king in front of the pawn—then promotion is guaranteed regardless of whose turn it is.',
    ],
    commonMistake: {
      title: 'Pushing the Pawn With Check Too Early',
      detail:
        'Playing e4-e5-e6+ without your king on the 6th rank lets the defending king stand on e8/d8 and force a stalemate draw.',
    },
  },
  {
    id: 'rook-behind-pawn',
    number: '11',
    category: 'endgames',
    level: 'Intermediate',
    readMinutes: 4,
    title: 'Place Your Rook Behind Passed Pawns',
    subtitle: 'Tarrasch’s golden rule: rooks gain space as passed pawns advance from in front of them',
    summary:
      'A rook sitting in front of its own passed pawn becomes progressively cramped until it blocks the promotion square. Place your rook behind the passed pawn—yours or your opponent’s—so every advance increases your rook’s activity.',
    orientation: 'w',
    initialFen: '3r2k1/5ppp/8/P7/8/8/5PPP/2R3K1 w - - 0 1',
    steps: [
      {
        label: 'Claiming the a-File First',
        explanation:
          'White has an outside passed pawn on a5. If White carelessly pushes 1. a6?, Black plays 1... Ra8 and clamps the pawn from behind. Instead, White must seize the file behind the pawn immediately.',
        arrows: [{ from: 'c1', to: 'a1', tone: 'primary' }],
      },
      {
        uci: 'c1a1',
        san: 'Ra1!',
        label: '1. Ra1! — Behind the Passed Pawn',
        explanation:
          'White anchors the rook on a1. Notice how each step the a-pawn takes forward gives White’s rook more breathing room along the a-file.',
        arrows: [{ from: 'a1', to: 'a8', tone: 'primary' }],
      },
      {
        uci: 'd8a8',
        san: 'Ra8',
        label: '1... Ra8 — Trying to Blockade',
        explanation: 'Black races to blockade from in front, which is far more passive.',
      },
      {
        uci: 'a5a6',
        san: 'a6',
        label: '2. a6 — Advancing Under Protection',
        explanation:
          'With Ra1 backing every square up to a8, White can push the pawn while bringing the king into the center.',
      },
    ],
    drill: {
      prompt: 'White to move. Apply Tarrasch’s Rule before Black locks down the a-file.',
      fen: '3r2k1/5ppp/8/P7/8/8/5PPP/2R3K1 w - - 0 1',
      acceptedUcis: ['c1a1'],
      solutionSan: 'Ra1',
      hint: 'Put your rook directly behind your passed a5-pawn before advancing the pawn.',
      successNote: 'Perfect! From a1, your rook supports every square up to a8 without ever getting in the way.',
    },
    checklist: [
      'Move your rook behind your passed pawn before pushing it onto the 6th or 7th rank.',
      'Against an opponent’s passed pawn, swing your rook behind it so their king cannot shelter easily.',
      'Keep your rook active—passivity in rook endgames loses more half-points than missing a pawn.',
    ],
    commonMistake: {
      title: 'Parking Your Rook on a8 in Front of Your Own Pawn',
      detail:
        'A rook on a8 stops its own pawn from crowning and forces you to waste extra tempos moving the rook aside while your opponent attacks.',
    },
  },
  {
    id: 'philidor-defense',
    number: '12',
    category: 'endgames',
    level: 'Advanced',
    readMinutes: 5,
    title: 'Hold Rook Endgames With the Philidor Defense',
    subtitle: 'Cut off the enemy king along the 3rd rank, then check relentlessly from behind',
    summary:
      'Down a pawn in a rook endgame, passive defense on your back rank usually loses. Instead, post your rook on your 3rd rank (the opponent’s 6th) to keep the enemy king out—and the moment the pawn advances, drop behind it for endless checks.',
    orientation: 'b',
    initialFen: '4k3/1R6/8/3K4/4P3/8/r7/8 b - - 0 1',
    steps: [
      {
        label: 'Preventing the King From Crossing',
        explanation:
          'White threatens Kd6 or Ke6, creating mating nets alongside Rb8+. Black must immediately cut off the 6th rank with the rook.',
        highlights: [
          { square: 'a6', tone: 'primary' },
          { square: 'd6', tone: 'amber' },
          { square: 'e6', tone: 'amber' },
        ],
      },
      {
        uci: 'a2a6',
        san: 'Ra6!',
        label: '1... Ra6! — The 6th-Rank Barrier',
        explanation:
          'Black’s rook patrols the entire 6th rank. White’s king cannot step forward to d6, e6, or f6.',
        arrows: [{ from: 'a6', to: 'h6', tone: 'primary' }],
      },
      {
        uci: 'e4e5',
        san: 'e5',
        label: '2. e5 — Forced Pawn Advance',
        explanation:
          'Since the king cannot cross the 6th rank, White’s only try for progress is pushing the pawn to e5—which surrenders the pawn’s shelter.',
        highlights: [{ square: 'e5', tone: 'amber' }],
      },
      {
        uci: 'a6a1',
        san: 'Ra1!',
        label: '2... Ra1! — Switch Behind the King',
        explanation:
          'Once the pawn advances and stops shielding White’s king from behind, Black drops to the 1st rank to rain endless checks (`Rd1+`, `Re1+`) for an effortless draw.',
        arrows: [{ from: 'a1', to: 'd1', tone: 'primary' }],
      },
    ],
    drill: {
      prompt: 'Black to move. Stop White’s king from reaching the 6th rank.',
      fen: '4k3/1R6/8/3K4/4P3/8/r7/8 b - - 0 1',
      acceptedUcis: ['a2a6'],
      solutionSan: 'Ra6',
      hint: 'Slide your rook up to your 3rd rank (White’s 6th rank) to build a barrier.',
      successNote: 'Textbook Philidor! As soon as White’s pawn advances later, you drop to the 1st rank and check from behind.',
    },
    checklist: [
      'Put your defending king directly in front of the opponent’s passed pawn.',
      'Hold your rook on your 3rd rank (6th rank for Black) until the pawn crosses onto that rank.',
      'Immediately switch to checks from behind (1st/8th rank) once the pawn advances.',
    ],
    commonMistake: {
      title: 'Dropping to the Back Rank Too Soon',
      detail:
        'If Black plays ...Ra1 before White pushes the pawn, White’s king steps up to e6 using its own pawn as an umbrella against rear checks.',
    },
  },
];
