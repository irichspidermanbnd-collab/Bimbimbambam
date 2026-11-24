import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Move,
  parseFen,
} from '../lib/chess';
import {
  deleteSavedGame,
  fetchSavedGameById,
  fetchSavedGames,
  formatPgnFromSans,
  SavedGameRecord,
  saveGameToArchive,
  triggerPgnDownload,
} from '../lib/api';
import {
  analyzeSinglePly,
  AnalyzedPly,
  computeSummaryStats,
  evaluateStatic,
  formatEvalLabel,
  MoveClassification,
} from '../lib/engine';
import { parsePgnMoves, SAMPLE_GAMES } from '../lib/pgn';
import { playChessSound } from '../lib/sound';
import { ChessBoard } from './ChessBoard';

export interface AnalysisJob {
  id: string;
  title: string;
  initialFen: string;
  moves: Move[];
  savedRecordId?: string;
}

interface GameAnalysisViewProps {
  soundEnabled: boolean;
  externalJob: AnalysisJob | null;
  initialSharedGameId?: string;
}

const CLASSIFICATION_STYLES: Record<MoveClassification, { text: string; badge: string }> = {
  Best: { text: 'text-[#1B4D3E]', badge: 'Best' },
  Good: { text: 'text-[#3F3F46]', badge: 'Good' },
  Inaccuracy: { text: 'text-[#92400E]', badge: 'Inaccuracy' },
  Mistake: { text: 'text-[#B45309]', badge: 'Mistake' },
  Blunder: { text: 'text-[#991B1B]', badge: 'Blunder' },
};

export const GameAnalysisView: React.FC<GameAnalysisViewProps> = ({
  soundEnabled,
  externalJob,
  initialSharedGameId,
}) => {
  const [activeJob, setActiveJob] = useState<AnalysisJob>(() => {
    if (externalJob) return externalJob;
    const sample = SAMPLE_GAMES[0];
    const parsed = parsePgnMoves(sample.pgn);
    return {
      id: sample.id,
      title: sample.title,
      initialFen: parsed.initialFen,
      moves: parsed.moves,
    };
  });

  const [analyzedPlies, setAnalyzedPlies] = useState<AnalyzedPly[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPly, setSelectedPly] = useState(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [showBestArrow, setShowBestArrow] = useState(true);
  const [pgnOpen, setPgnOpen] = useState(false);
  const [pgnText, setPgnText] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);

  // Server archive state
  const [savedGames, setSavedGames] = useState<SavedGameRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const cancelTokenRef = useRef(0);

  // Fetch saved games archive from backend
  useEffect(() => {
    fetchSavedGames().then(setSavedGames);
  }, []);

  // Load shared game from URL query (?game=<id>) if provided
  useEffect(() => {
    if (!initialSharedGameId || externalJob) return;
    fetchSavedGameById(initialSharedGameId).then((record) => {
      if (!record) return;
      try {
        const parsed = parsePgnMoves(record.pgn);
        setActiveJob({
          id: record.id,
          title: record.title,
          initialFen: parsed.initialFen,
          moves: parsed.moves,
          savedRecordId: record.id,
        });
      } catch {
        // Ignore malformed record
      }
    });
  }, [initialSharedGameId, externalJob]);

  // Sync if a newly completed bot game was sent to analysis
  useEffect(() => {
    if (externalJob) {
      setActiveJob(externalJob);
    }
  }, [externalJob]);

  // Progressive asynchronous ply-by-ply analysis
  useEffect(() => {
    const token = ++cancelTokenRef.current;
    setAnalyzedPlies([]);
    setSelectedPly(0);
    setIsAnalyzing(true);

    let currentState = parseFen(activeJob.initialFen);
    let idx = 0;
    const collected: AnalyzedPly[] = [];

    const stepNext = () => {
      if (cancelTokenRef.current !== token) return;
      if (idx >= activeJob.moves.length) {
        setIsAnalyzing(false);
        return;
      }

      const { plyData, nextState } = analyzeSinglePly(
        currentState,
        activeJob.moves[idx],
        idx + 1
      );
      currentState = nextState;
      collected.push(plyData);
      setAnalyzedPlies([...collected]);
      idx++;

      window.setTimeout(stepNext, 10);
    };

    window.setTimeout(stepNext, 16);
    return () => {
      cancelTokenRef.current++;
    };
  }, [activeJob]);

  // Keyboard arrow navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedPly((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedPly((p) => Math.min(analyzedPlies.length, p + 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedPly(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setSelectedPly(analyzedPlies.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [analyzedPlies.length]);

  const summary = useMemo(() => computeSummaryStats(analyzedPlies), [analyzedPlies]);

  const currentBoardView = useMemo(() => {
    if (selectedPly === 0 || analyzedPlies.length === 0) {
      const st = parseFen(activeJob.initialFen);
      return {
        state: st,
        lastMove: null,
        evalCp: evaluateStatic(st),
        mateIn: undefined as number | undefined,
        activePly: null as AnalyzedPly | null,
      };
    }

    const clamped = Math.min(selectedPly, analyzedPlies.length);
    const ply = analyzedPlies[clamped - 1];
    return {
      state: parseFen(ply.fenAfter),
      lastMove: { from: ply.from, to: ply.to },
      evalCp: ply.evalAfterCp,
      mateIn: ply.mateAfter,
      activePly: ply,
    };
  }, [activeJob.initialFen, analyzedPlies, selectedPly]);

  const whiteBarPct = useMemo(() => {
    if (currentBoardView.mateIn !== undefined) {
      return currentBoardView.mateIn > 0 ? 97 : 3;
    }
    const clamped = Math.max(-900, Math.min(900, currentBoardView.evalCp));
    const winProb = 1 / (1 + Math.exp(-0.004 * clamped));
    return Math.round(Math.max(4, Math.min(96, winProb * 100)));
  }, [currentBoardView.evalCp, currentBoardView.mateIn]);

  const engineArrows = useMemo(() => {
    if (!showBestArrow || !currentBoardView.activePly) return [];
    const p = currentBoardView.activePly;
    if (p.classification === 'Best') return [];
    return [
      {
        from: p.bestMoveFrom,
        to: p.bestMoveTo,
        tone: 'primary' as const,
      },
    ];
  }, [showBestArrow, currentBoardView.activePly]);

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_GAMES.find((g) => g.id === sampleId);
    if (!sample) return;
    const parsed = parsePgnMoves(sample.pgn);
    setActiveJob({
      id: sample.id,
      title: sample.title,
      initialFen: parsed.initialFen,
      moves: parsed.moves,
    });
    setPgnOpen(false);
    setPgnError(null);
  };

  const handleLoadSavedRecord = (record: SavedGameRecord) => {
    try {
      const parsed = parsePgnMoves(record.pgn);
      setActiveJob({
        id: record.id,
        title: record.title,
        initialFen: parsed.initialFen,
        moves: parsed.moves,
        savedRecordId: record.id,
      });
      window.history.replaceState(null, '', `/analysis?game=${encodeURIComponent(record.id)}`);
      setPgnOpen(false);
      setPgnError(null);
    } catch {
      setPgnError('Could not load saved game PGN.');
    }
  };

  const handleDeleteSavedRecord = async (id: string) => {
    const ok = await deleteSavedGame(id);
    if (ok) {
      setSavedGames((prev) => prev.filter((g) => g.id !== id));
      if (activeJob.savedRecordId === id) {
        setActiveJob((prev) => ({ ...prev, savedRecordId: undefined }));
      }
    }
  };

  const handleSaveCurrentAnalysis = async () => {
    if (isSaving || activeJob.savedRecordId || analyzedPlies.length === 0) return;
    setIsSaving(true);
    const pgn = formatPgnFromSans(
      analyzedPlies.map((p) => p.san),
      { event: activeJob.title }
    );
    const saved = await saveGameToArchive({
      title: activeJob.title,
      pgn,
      result: '*',
      whiteAccuracy: summary.whiteAccuracy,
      blackAccuracy: summary.blackAccuracy,
      movesCount: analyzedPlies.length,
    });
    if (saved) {
      setSavedGames((prev) => [saved, ...prev]);
      setActiveJob((prev) => ({ ...prev, savedRecordId: saved.id }));
      window.history.replaceState(null, '', `/analysis?game=${encodeURIComponent(saved.id)}`);
    }
    setIsSaving(false);
  };

  const handleCopyShareLink = async () => {
    let recordId = activeJob.savedRecordId;
    if (!recordId && analyzedPlies.length > 0) {
      const pgn = formatPgnFromSans(
        analyzedPlies.map((p) => p.san),
        { event: activeJob.title }
      );
      const saved = await saveGameToArchive({
        title: activeJob.title,
        pgn,
        result: '*',
        whiteAccuracy: summary.whiteAccuracy,
        blackAccuracy: summary.blackAccuracy,
        movesCount: analyzedPlies.length,
      });
      if (saved) {
        recordId = saved.id;
        setSavedGames((prev) => [saved, ...prev]);
        setActiveJob((prev) => ({ ...prev, savedRecordId: saved.id }));
        window.history.replaceState(null, '', `/analysis?game=${encodeURIComponent(saved.id)}`);
      }
    }

    const shareUrl = recordId
      ? `${window.location.origin}/analysis?game=${encodeURIComponent(recordId)}`
      : window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 1800);
  };

  const handleImportPgn = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = parsePgnMoves(pgnText);
      setActiveJob({
        id: `pgn-${Date.now()}`,
        title: parsed.title,
        initialFen: parsed.initialFen,
        moves: parsed.moves,
      });
      setPgnError(null);
      setPgnOpen(false);
    } catch (err) {
      setPgnError(err instanceof Error ? err.message : 'Unable to parse PGN.');
    }
  };

  const selectPly = (ply: number) => {
    const clamped = Math.max(0, Math.min(analyzedPlies.length, ply));
    setSelectedPly(clamped);
    if (clamped > 0) {
      playChessSound('move', soundEnabled);
    }
  };

  const movePairs = useMemo(() => {
    const pairs: {
      num: number;
      white?: AnalyzedPly;
      black?: AnalyzedPly;
    }[] = [];
    for (let i = 0; i < analyzedPlies.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: analyzedPlies[i],
        black: analyzedPlies[i + 1],
      });
    }
    return pairs;
  }, [analyzedPlies]);

  const evalText = formatEvalLabel(currentBoardView.evalCp, currentBoardView.mateIn);
  const advantageText =
    currentBoardView.mateIn !== undefined
      ? currentBoardView.mateIn > 0
        ? `Forced mate for White in ${currentBoardView.mateIn}`
        : `Forced mate for Black in ${Math.abs(currentBoardView.mateIn)}`
      : currentBoardView.evalCp > 45
      ? 'White advantage'
      : currentBoardView.evalCp < -45
      ? 'Black advantage'
      : 'Balanced position';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      {/* Left Zone: Eval Bar + Chessboard + Navigation */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-[612px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => selectPly(0)}
              disabled={selectedPly === 0}
              aria-label="First position"
              className="p-2 rounded-sm bg-white border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:border-[#C8C2B6] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronFirst className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => selectPly(selectedPly - 1)}
              disabled={selectedPly === 0}
              aria-label="Previous move"
              className="p-2 rounded-sm bg-white border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:border-[#C8C2B6] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => selectPly(selectedPly + 1)}
              disabled={selectedPly >= analyzedPlies.length}
              aria-label="Next move"
              className="p-2 rounded-sm bg-white border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:border-[#C8C2B6] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => selectPly(analyzedPlies.length)}
              disabled={selectedPly >= analyzedPlies.length}
              aria-label="Final position"
              className="p-2 rounded-sm bg-white border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:border-[#C8C2B6] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLast className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBestArrow((s) => !s)}
              className={`px-3 py-1.5 text-xs font-medium border rounded-sm transition-colors cursor-pointer ${
                showBestArrow
                  ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                  : 'bg-white text-[#57534E] border-[#E4E0D8] hover:text-[#18181B]'
              }`}
            >
              {showBestArrow ? 'Best Move Arrow: On' : 'Best Move Arrow: Off'}
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
        </div>

        {/* Eval Bar + Board Side-by-Side */}
        <div className="flex items-stretch gap-3 max-w-[612px]">
          <div
            className="w-7 shrink-0 rounded-sm border border-[#D4CFC5] overflow-hidden flex flex-col justify-between bg-[#232326] relative"
            aria-label={`Engine evaluation ${evalText}, ${advantageText}`}
          >
            <div
              className={`w-full transition-all duration-300 ease-out ${
                orientation === 'w' ? 'bg-[#232326]' : 'bg-[#FAF8F3]'
              }`}
              style={{
                height: `${orientation === 'w' ? 100 - whiteBarPct : whiteBarPct}%`,
              }}
            />
            <div
              className={`w-full flex-1 ${
                orientation === 'w' ? 'bg-[#FAF8F3]' : 'bg-[#232326]'
              }`}
            />
            <span
              className={`absolute left-0 right-0 text-center text-[10px] font-mono font-semibold tabular-nums px-0.5 ${
                currentBoardView.evalCp >= 0
                  ? 'bottom-1.5 text-[#18181B]'
                  : 'top-1.5 text-[#FAF8F3]'
              }`}
            >
              {evalText}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <ChessBoard
              state={currentBoardView.state}
              orientation={orientation}
              interactive={false}
              lastMove={currentBoardView.lastMove}
              arrows={engineArrows}
              sizeClass="w-full"
            />
          </div>
        </div>

        {/* Evaluation Status Footer */}
        <div className="mt-3 max-w-[612px] flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold tabular-nums text-[#18181B]">
              Eval {evalText}
            </span>
            <span aria-hidden="true">·</span>
            <span>{advantageText}</span>
          </div>
          <span className="font-mono tabular-nums">
            Ply {selectedPly} / {activeJob.moves.length} · Use ← / → keys
          </span>
        </div>

        {/* Selected Move Commentary Box */}
        <div className="mt-5 max-w-[612px] bg-white border border-[#E4E0D8] rounded-sm p-5">
          {currentBoardView.activePly ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[#18181B]">
                    {currentBoardView.activePly.moveNumber}.
                    {currentBoardView.activePly.color === 'b' ? '.. ' : ' '}
                    {currentBoardView.activePly.san}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      CLASSIFICATION_STYLES[currentBoardView.activePly.classification].text
                    }`}
                  >
                    {currentBoardView.activePly.classification}
                  </span>
                </div>
                {currentBoardView.activePly.classification !== 'Best' && (
                  <span className="text-xs font-mono text-[#1B4D3E]">
                    Engine preferred: {currentBoardView.activePly.bestMoveSan}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[#3F3F46] leading-relaxed">
                {currentBoardView.activePly.comment}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#18181B]">{activeJob.title}</p>
              <p className="mt-1 text-xs text-[#57534E]">
                Step forward through the move list or click any point on the evaluation chart to inspect critical moments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Zone: Loader, Accuracy, Evaluation Chart & Move List */}
      <div className="lg:col-span-5 space-y-6">
        {/* Game Selector, Save, Share & PGN Import */}
        <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-[#18181B]">
              Analyzed Game
            </h2>
            <button
              type="button"
              onClick={() => setPgnOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E] hover:underline underline-offset-4 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{pgnOpen ? 'Close PGN Import' : 'Paste PGN'}</span>
            </button>
          </div>

          <p className="mt-1 text-xs font-medium text-[#18181B]">{activeJob.title}</p>

          {/* Action Row: Save, Share Link, Download PGN */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentAnalysis}
              disabled={isSaving || Boolean(activeJob.savedRecordId) || isAnalyzing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#18181B] bg-[#F8F6F1] border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {activeJob.savedRecordId ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#1B4D3E]" aria-hidden="true" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#18181B] bg-[#F8F6F1] border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#1B4D3E]" aria-hidden="true" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Share Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const pgn = formatPgnFromSans(
                  analyzedPlies.map((p) => p.san),
                  { event: activeJob.title }
                );
                triggerPgnDownload('analyzed-game.pgn', pgn);
              }}
              disabled={analyzedPlies.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#18181B] bg-[#F8F6F1] border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download PGN</span>
            </button>
          </div>

          {pgnOpen ? (
            <form onSubmit={handleImportPgn} className="mt-4 pt-4 border-t border-[#EFECE4] space-y-2.5">
              <textarea
                rows={4}
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder="Paste standard PGN moves, e.g. 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
                className="w-full p-2.5 text-xs font-mono bg-[#F8F6F1] border border-[#D4CFC5] rounded-sm text-[#18181B] focus:outline-none focus:border-[#1B4D3E]"
              />
              {pgnError && (
                <p className="text-xs text-[#991B1B] font-medium">{pgnError}</p>
              )}
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4D3E] rounded-sm hover:bg-[#153E32] transition-colors cursor-pointer"
              >
                Analyze PGN
              </button>
            </form>
          ) : (
            <div className="mt-4 pt-4 border-t border-[#EFECE4]">
              <label htmlFor="sample-game-select" className="block text-xs text-[#57534E] mb-1.5">
                Classic instructive games
              </label>
              <select
                id="sample-game-select"
                value={SAMPLE_GAMES.some((g) => g.id === activeJob.id) ? activeJob.id : ''}
                onChange={(e) => {
                  if (e.target.value) handleLoadSample(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs bg-[#F8F6F1] border border-[#D4CFC5] rounded-sm text-[#18181B] focus:outline-none focus:border-[#1B4D3E]"
              >
                {!SAMPLE_GAMES.some((g) => g.id === activeJob.id) && (
                  <option value="">Current: {activeJob.title}</option>
                )}
                {SAMPLE_GAMES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAnalyzing && (
            <div className="mt-4 pt-3 border-t border-[#EFECE4]">
              <div className="flex items-center justify-between text-xs text-[#57534E] mb-1.5">
                <span>Analyzing game moves...</span>
                <span className="font-mono tabular-nums">
                  {analyzedPlies.length} / {activeJob.moves.length}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#EFECE4] rounded-xs overflow-hidden">
                <div
                  className="h-full bg-[#1B4D3E] transition-all duration-150"
                  style={{
                    width: `${
                      activeJob.moves.length > 0
                        ? Math.round((analyzedPlies.length / activeJob.moves.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Saved Archive List (Real Backend Persistence) */}
        {savedGames.length > 0 && (
          <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
            <h2 className="font-serif text-base font-semibold text-[#18181B] mb-3">
              Saved Archive ({savedGames.length})
            </h2>
            <ul className="divide-y divide-[#EFECE4] max-h-[180px] overflow-y-auto">
              {savedGames.map((g) => (
                <li key={g.id} className="py-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleLoadSavedRecord(g)}
                    className="text-left min-w-0 flex-1 group cursor-pointer"
                  >
                    <p
                      className={`text-xs font-medium truncate group-hover:text-[#1B4D3E] ${
                        activeJob.savedRecordId === g.id ? 'text-[#1B4D3E] font-semibold' : 'text-[#18181B]'
                      }`}
                    >
                      {g.title}
                    </p>
                    <p className="text-[11px] text-[#57534E] font-mono tabular-nums">
                      {g.movesCount} plies · {g.result}
                      {typeof g.whiteAccuracy === 'number' ? ` · W ${g.whiteAccuracy}%` : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedRecord(g.id)}
                    aria-label={`Delete ${g.title}`}
                    className="p-1.5 text-[#57534E] hover:text-[#991B1B] transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Accuracy & Move Classification Table */}
        <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#EFECE4]">
            <div>
              <p className="text-xs text-[#57534E]">White Accuracy</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#18181B]">
                {summary.whiteAccuracy}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#57534E]">Black Accuracy</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#18181B]">
                {summary.blackAccuracy}%
              </p>
            </div>
          </div>

          <table className="w-full mt-4 text-xs">
            <thead>
              <tr className="text-[#57534E] border-b border-[#EFECE4]">
                <th className="py-1.5 text-left font-medium">Quality</th>
                <th className="py-1.5 text-right font-medium">White</th>
                <th className="py-1.5 text-right font-medium">Black</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE4] font-mono tabular-nums">
              {(['Best', 'Good', 'Inaccuracy', 'Mistake', 'Blunder'] as MoveClassification[]).map(
                (cls) => (
                  <tr key={cls}>
                    <td className={`py-1.5 font-sans font-medium ${CLASSIFICATION_STYLES[cls].text}`}>
                      {cls}
                    </td>
                    <td className="py-1.5 text-right text-[#18181B]">{summary.counts.w[cls]}</td>
                    <td className="py-1.5 text-right text-[#18181B]">{summary.counts.b[cls]}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Evaluation Graph */}
        <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-serif text-base font-semibold text-[#18181B]">
              Advantage Curve
            </h2>
            <span className="text-[11px] text-[#57534E]">Click graph to jump to move</span>
          </div>

          <div className="w-full h-24 bg-[#F8F6F1] border border-[#EFECE4] rounded-sm overflow-hidden">
            {analyzedPlies.length > 0 ? (
              <svg
                viewBox={`0 0 ${Math.max(10, analyzedPlies.length) * 10} 100`}
                preserveAspectRatio="none"
                className="w-full h-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const ply = Math.round(ratio * analyzedPlies.length);
                  selectPly(ply);
                }}
              >
                <line
                  x1="0"
                  y1="50"
                  x2={Math.max(10, analyzedPlies.length) * 10}
                  y2="50"
                  stroke="#D4CFC5"
                  strokeWidth="1"
                />
                <polygon
                  fill="#1B4D3E"
                  fillOpacity="0.16"
                  points={`0,50 ${analyzedPlies
                    .map((p, idx) => {
                      const x = (idx + 1) * 10;
                      const clamped = Math.max(-700, Math.min(700, p.evalAfterCp));
                      const y = 50 - (clamped / 700) * 45;
                      return `${x},${y.toFixed(1)}`;
                    })
                    .join(' ')} ${analyzedPlies.length * 10},50`}
                />
                <polyline
                  fill="none"
                  stroke="#1B4D3E"
                  strokeWidth="2"
                  points={`0,50 ${analyzedPlies
                    .map((p, idx) => {
                      const x = (idx + 1) * 10;
                      const clamped = Math.max(-700, Math.min(700, p.evalAfterCp));
                      const y = 50 - (clamped / 700) * 45;
                      return `${x},${y.toFixed(1)}`;
                    })
                    .join(' ')}`}
                />
                {selectedPly > 0 && selectedPly <= analyzedPlies.length && (
                  <line
                    x1={selectedPly * 10}
                    y1="0"
                    x2={selectedPly * 10}
                    y2="100"
                    stroke="#B45309"
                    strokeWidth="2"
                  />
                )}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#57534E]">
                Preparing evaluation curve...
              </div>
            )}
          </div>
        </div>

        {/* Clickable Move List */}
        <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
          <h2 className="font-serif text-base font-semibold text-[#18181B] mb-3">
            Move-by-Move Breakdown
          </h2>
          <div className="max-h-[260px] overflow-y-auto border border-[#EFECE4] rounded-sm bg-[#F8F6F1]">
            {movePairs.length === 0 ? (
              <p className="p-4 text-xs text-[#57534E]">Analyzing opening moves...</p>
            ) : (
              <table className="w-full text-xs font-mono tabular-nums">
                <tbody>
                  {movePairs.map((pair) => (
                    <tr key={pair.num} className="border-b border-[#EFECE4] last:border-b-0">
                      <td className="w-10 px-3 py-1.5 text-[#57534E]">{pair.num}.</td>
                      <td className="px-1.5 py-1">
                        {pair.white && (
                          <button
                            type="button"
                            onClick={() => selectPly(pair.white!.ply)}
                            className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              selectedPly === pair.white.ply
                                ? 'bg-[#1B4D3E] text-white'
                                : 'hover:bg-[#EFECE4] text-[#18181B]'
                            }`}
                          >
                            <span className="font-medium">{pair.white.san}</span>
                            {(pair.white.classification === 'Mistake' ||
                              pair.white.classification === 'Blunder' ||
                              pair.white.classification === 'Inaccuracy') && (
                              <span
                                className={`text-[10px] font-sans font-semibold ${
                                  selectedPly === pair.white.ply
                                    ? 'text-white/90'
                                    : CLASSIFICATION_STYLES[pair.white.classification].text
                                }`}
                              >
                                {pair.white.classification}
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-1.5 py-1">
                        {pair.black && (
                          <button
                            type="button"
                            onClick={() => selectPly(pair.black!.ply)}
                            className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              selectedPly === pair.black.ply
                                ? 'bg-[#1B4D3E] text-white'
                                : 'hover:bg-[#EFECE4] text-[#18181B]'
                            }`}
                          >
                            <span className="font-medium">{pair.black.san}</span>
                            {(pair.black.classification === 'Mistake' ||
                              pair.black.classification === 'Blunder' ||
                              pair.black.classification === 'Inaccuracy') && (
                              <span
                                className={`text-[10px] font-sans font-semibold ${
                                  selectedPly === pair.black.ply
                                    ? 'text-white/90'
                                    : CLASSIFICATION_STYLES[pair.black.classification].text
                                }`}
                              >
                                {pair.black.classification}
                              </span>
                            )}
                          </button>
                        )}
                      </td>
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
};
