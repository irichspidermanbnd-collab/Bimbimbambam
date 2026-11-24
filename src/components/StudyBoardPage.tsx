import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  RefreshCw,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHESS_TIPS, CATEGORY_META } from '../data/chessTips';
import {
  ChessState,
  getLegalMoves,
  isKingInCheck,
  makeMove,
  Move,
  parseFen,
  PieceType,
  STARTING_FEN,
  toFen,
} from '../lib/chess';
import { playChessSound } from '../lib/sound';
import { ChessBoard } from './ChessBoard';

interface HistoryEntry {
  state: ChessState;
  san?: string;
  lastMove: { from: string; to: string } | null;
}

interface StudyBoardPageProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  initialPresetId?: string;
  embedded?: boolean;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const StudyBoardPage: React.FC<StudyBoardPageProps> = ({
  soundEnabled,
  onToggleSound,
  initialPresetId,
  embedded = false,
}) => {
  const initialTip = initialPresetId
    ? CHESS_TIPS.find((t) => t.id === initialPresetId)
    : undefined;

  const [selectedPreset, setSelectedPreset] = useState<string>(
    initialTip ? initialTip.id : 'standard'
  );
  const [orientation, setOrientation] = useState<'w' | 'b'>(
    initialTip ? initialTip.orientation : 'w'
  );
  const [showLegalHints, setShowLegalHints] = useState(true);
  const [copiedFen, setCopiedFen] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    {
      state: parseFen(initialTip ? initialTip.drill.fen : STARTING_FEN),
      lastMove: null,
    },
  ]);

  const currentEntry = history[history.length - 1];
  const currentState = currentEntry.state;

  const boardStatus = useMemo(() => {
    const legal = getLegalMoves(currentState);
    const inCheck = isKingInCheck(currentState.board, currentState.turn);
    if (legal.length === 0) {
      if (inCheck) {
        return {
          kind: 'checkmate' as const,
          label: `Checkmate — ${currentState.turn === 'w' ? 'Black' : 'White'} wins`,
        };
      }
      return {
        kind: 'stalemate' as const,
        label: 'Stalemate — Drawn position',
      };
    }
    if (inCheck) {
      return {
        kind: 'check' as const,
        label: `${currentState.turn === 'w' ? 'White' : 'Black'} is in check`,
      };
    }
    return {
      kind: 'active' as const,
      label: `${currentState.turn === 'w' ? 'White' : 'Black'} to move`,
    };
  }, [currentState]);

  const materialBalance = useMemo(() => {
    let white = 0;
    let black = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = currentState.board[r][c];
        if (!p) continue;
        if (p.color === 'w') white += PIECE_VALUES[p.type];
        else black += PIECE_VALUES[p.type];
      }
    }
    return white - black;
  }, [currentState]);

  const loadPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'standard') {
      setOrientation('w');
      setHistory([{ state: parseFen(STARTING_FEN), lastMove: null }]);
    } else {
      const tip = CHESS_TIPS.find((t) => t.id === presetId);
      if (tip) {
        setOrientation(tip.orientation);
        setHistory([{ state: parseFen(tip.drill.fen), lastMove: null }]);
      }
    }
  };

  const handleMove = (move: Move) => {
    const res = makeMove(currentState, move);
    if (res.isCheckmate) {
      playChessSound('success', soundEnabled);
    } else if (res.isCheck) {
      playChessSound('check', soundEnabled);
    } else if (move.isCapture) {
      playChessSound('capture', soundEnabled);
    } else {
      playChessSound('move', soundEnabled);
    }

    setHistory((prev) => [
      ...prev,
      {
        state: res.nextState,
        san: res.san,
        lastMove: { from: move.from, to: move.to },
      },
    ]);
  };

  const handleCopyFen = () => {
    const fen = toFen(currentState);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fen).catch(() => {});
    }
    setCopiedFen(true);
    window.setTimeout(() => setCopiedFen(false), 1800);
  };

  const movePairs = useMemo(() => {
    const moves = history.slice(1).map((h) => h.san || '');
    const pairs: { num: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1],
      });
    }
    return pairs;
  }, [history]);

  const innerContent = (
    <div className={embedded ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start' : 'mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start'}>
        {/* Left: Board & Primary Controls */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-[580px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (history.length > 1) setHistory((h) => h.slice(0, -1));
                }}
                disabled={history.length <= 1}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] rounded-sm disabled:opacity-40 hover:border-[#C8C2B6] transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={() => loadPreset(selectedPreset)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Flip</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLegalHints((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium border rounded-sm transition-colors cursor-pointer ${
                  showLegalHints
                    ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                    : 'bg-white text-[#57534E] border-[#E4E0D8] hover:text-[#18181B]'
                }`}
              >
                {showLegalHints ? 'Move Hints: On' : 'Move Hints: Off'}
              </button>
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
                className="inline-flex items-center justify-center w-8 h-8 text-[#57534E] bg-white border border-[#E4E0D8] rounded-sm hover:text-[#18181B] transition-colors cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <ChessBoard
            state={currentState}
            orientation={orientation}
            interactive={boardStatus.kind !== 'checkmate' && boardStatus.kind !== 'stalemate'}
            onMove={handleMove}
            lastMove={currentEntry.lastMove}
            showLegalHints={showLegalHints}
            sizeClass="w-full max-w-[580px]"
          />

          <div className="mt-3 max-w-[580px] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-3 h-3 rounded-xs border border-[#18181B]/40 ${
                  currentState.turn === 'w' ? 'bg-[#FAF8F3]' : 'bg-[#232326]'
                }`}
                aria-hidden="true"
              />
              <span
                className={`font-semibold ${
                  boardStatus.kind === 'check' || boardStatus.kind === 'checkmate'
                    ? 'text-[#9A3412]'
                    : 'text-[#18181B]'
                }`}
              >
                {boardStatus.label}
              </span>
            </div>

            <span className="font-mono tabular-nums text-[#57534E]">
              Material:{' '}
              {materialBalance === 0
                ? 'Equal'
                : materialBalance > 0
                ? `White +${materialBalance}`
                : `Black +${Math.abs(materialBalance)}`}
            </span>
          </div>
        </div>

        {/* Right: Position Loader & Notation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Load Position */}
          <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
            <label
              htmlFor="preset-select"
              className="block font-serif text-lg font-semibold text-[#18181B]"
            >
              Load Study Position
            </label>
            <p className="mt-1 text-xs text-[#57534E]">
              Jump straight into the standard starting board or any tip position.
            </p>
            <select
              id="preset-select"
              value={selectedPreset}
              onChange={(e) => loadPreset(e.target.value)}
              className="mt-3 w-full px-3 py-2 text-sm bg-[#F8F6F1] border border-[#D4CFC5] rounded-sm text-[#18181B] focus:outline-none focus:border-[#1B4D3E]"
            >
              <option value="standard">Standard Starting Position</option>
              {CHESS_TIPS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.number}. {t.title} ({CATEGORY_META[t.category].label})
                </option>
              ))}
            </select>

            <div className="mt-4 pt-4 border-t border-[#EFECE4] flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-[#57534E] truncate">
                {toFen(currentState)}
              </span>
              <button
                type="button"
                onClick={handleCopyFen}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#18181B] bg-[#F8F6F1] border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors shrink-0 cursor-pointer"
              >
                {copiedFen ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#1B4D3E]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy FEN</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Algebraic Move History */}
          <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
            <h2 className="font-serif text-lg font-semibold text-[#18181B]">
              Move Notation
            </h2>
            <div className="mt-3 max-h-[280px] overflow-y-auto border border-[#EFECE4] rounded-sm bg-[#F8F6F1]">
              {movePairs.length === 0 ? (
                <p className="p-4 text-xs text-[#57534E]">
                  Play a move on the board to record algebraic notation.
                </p>
              ) : (
                <table className="w-full text-xs font-mono tabular-nums">
                  <tbody>
                    {movePairs.map((pair) => (
                      <tr key={pair.num} className="border-b border-[#EFECE4] last:border-b-0">
                        <td className="w-12 px-3 py-2 text-[#57534E]">{pair.num}.</td>
                        <td className="px-3 py-2 text-[#18181B] font-medium">{pair.white}</td>
                        <td className="px-3 py-2 text-[#18181B] font-medium">{pair.black ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
      <header className="pb-8 border-b border-[#E4E0D8] max-w-3xl">
        <p className="text-xs text-[#57534E] mb-2">Interactive Sandbox</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#18181B]">
          Study Board
        </h1>
        <p className="mt-2.5 text-base text-[#57534E] leading-relaxed">
          Test variations freely with full legal move validation, or load any position from our twelve lessons to explore alternative lines.
        </p>
      </header>
      {innerContent}
    </div>
  );
};
