import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import { CATEGORY_META, ChessTip } from '../data/chessTips';
import { applyUciMove, ChessState, makeMove, Move, parseFen } from '../lib/chess';
import { playChessSound } from '../lib/sound';
import { ChessBoard } from './ChessBoard';

type StudyMode = 'walkthrough' | 'drill' | 'explore';

interface TipDetailPageProps {
  tip: ChessTip;
  allTips: ChessTip[];
  isSolved: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onMarkSolved: (tipId: string) => void;
  onBack: () => void;
  onSelectTip: (tipId: string) => void;
}

export const TipDetailPage: React.FC<TipDetailPageProps> = ({
  tip,
  allTips,
  isSolved,
  soundEnabled,
  onToggleSound,
  onMarkSolved,
  onBack,
  onSelectTip,
}) => {
  const [mode, setMode] = useState<StudyMode>('walkthrough');
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [orientation, setOrientation] = useState<'w' | 'b'>(tip.orientation);

  // Drill state
  const [drillState, setDrillState] = useState<ChessState>(() => parseFen(tip.drill.fen));
  const [drillLastMove, setDrillLastMove] = useState<{ from: string; to: string } | null>(null);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'correct' | 'incorrect' | 'revealed'>('idle');
  const [drillFeedback, setDrillFeedback] = useState<string>('');
  const [showHint, setShowHint] = useState(false);

  // Free explore state
  const [exploreHistory, setExploreHistory] = useState<
    { state: ChessState; san?: string; lastMove: { from: string; to: string } | null }[]
  >([]);

  // Reset when tip changes
  useEffect(() => {
    setMode('walkthrough');
    setStepIndex(0);
    setIsPlaying(false);
    setOrientation(tip.orientation);
    setDrillState(parseFen(tip.drill.fen));
    setDrillLastMove(null);
    setDrillStatus('idle');
    setDrillFeedback('');
    setShowHint(false);
    setExploreHistory([]);
  }, [tip]);

  // Precompute all states along the walkthrough steps
  const walkthroughFrames = useMemo(() => {
    const frames: {
      state: ChessState;
      lastMove: { from: string; to: string } | null;
      step: ChessTip['steps'][number];
    }[] = [];

    let current = parseFen(tip.initialFen);
    frames.push({
      state: current,
      lastMove: null,
      step: tip.steps[0],
    });

    for (let i = 1; i < tip.steps.length; i++) {
      const s = tip.steps[i];
      if (s.uci) {
        const res = applyUciMove(current, s.uci);
        if (res) {
          current = res.nextState;
          frames.push({
            state: current,
            lastMove: { from: s.uci.slice(0, 2), to: s.uci.slice(2, 4) },
            step: s,
          });
        }
      }
    }
    return frames;
  }, [tip]);

  // Auto-play timer for walkthrough
  useEffect(() => {
    if (!isPlaying || mode !== 'walkthrough') return;
    if (stepIndex >= walkthroughFrames.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setStepIndex((prev) => {
        const next = Math.min(prev + 1, walkthroughFrames.length - 1);
        playChessSound('move', soundEnabled);
        return next;
      });
    }, 1350);
    return () => window.clearTimeout(timer);
  }, [isPlaying, mode, stepIndex, walkthroughFrames.length, soundEnabled]);

  useEffect(() => {
    if (mode !== 'walkthrough') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex((i) => {
          const next = Math.min(walkthroughFrames.length - 1, i + 1);
          if (next !== i) playChessSound('move', soundEnabled);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, walkthroughFrames.length, soundEnabled]);

  const enterExploreMode = () => {
    const currentFrame = walkthroughFrames[stepIndex] || walkthroughFrames[0];
    setExploreHistory([{ state: currentFrame.state, lastMove: currentFrame.lastMove }]);
    setIsPlaying(false);
    setMode('explore');
  };

  const resetDrill = () => {
    setDrillState(parseFen(tip.drill.fen));
    setDrillLastMove(null);
    setDrillStatus('idle');
    setDrillFeedback('');
    setShowHint(false);
  };

  const handleDrillMove = (move: Move) => {
    if (drillStatus === 'correct' || drillStatus === 'revealed') return;
    const res = makeMove(drillState, move);
    const isAccepted = tip.drill.acceptedUcis.includes(res.uci);

    setDrillState(res.nextState);
    setDrillLastMove({ from: move.from, to: move.to });

    if (isAccepted) {
      setDrillStatus('correct');
      setDrillFeedback(tip.drill.successNote);
      playChessSound('success', soundEnabled);
      onMarkSolved(tip.id);
    } else {
      setDrillStatus('incorrect');
      setDrillFeedback(`${res.san} is legal, but it misses the key tactical or strategic idea. Try resetting and looking closer.`);
      playChessSound('error', soundEnabled);
    }
  };

  const revealDrillSolution = () => {
    const base = parseFen(tip.drill.fen);
    const firstSolution = tip.drill.acceptedUcis[0];
    const res = applyUciMove(base, firstSolution);
    if (res) {
      setDrillState(res.nextState);
      setDrillLastMove({ from: firstSolution.slice(0, 2), to: firstSolution.slice(2, 4) });
      setDrillStatus('revealed');
      setDrillFeedback(`Solution: ${tip.drill.solutionSan}. ${tip.drill.successNote}`);
      playChessSound('move', soundEnabled);
    }
  };

  const handleExploreMove = (move: Move) => {
    const latest = exploreHistory[exploreHistory.length - 1];
    if (!latest) return;
    const res = makeMove(latest.state, move);
    playChessSound(res.isCheck ? 'check' : move.isCapture ? 'capture' : 'move', soundEnabled);
    setExploreHistory((prev) => [
      ...prev,
      {
        state: res.nextState,
        san: res.san,
        lastMove: { from: move.from, to: move.to },
      },
    ]);
  };

  const currentFrame = walkthroughFrames[stepIndex] || walkthroughFrames[0];
  const activeBoardState =
    mode === 'walkthrough'
      ? currentFrame.state
      : mode === 'drill'
      ? drillState
      : exploreHistory[exploreHistory.length - 1]?.state ?? currentFrame.state;

  const activeLastMove =
    mode === 'walkthrough'
      ? currentFrame.lastMove
      : mode === 'drill'
      ? drillLastMove
      : exploreHistory[exploreHistory.length - 1]?.lastMove ?? null;

  const activeHighlights = mode === 'walkthrough' ? currentFrame.step.highlights ?? [] : [];
  const activeArrows = mode === 'walkthrough' ? currentFrame.step.arrows ?? [] : [];

  const tipIndex = allTips.findIndex((t) => t.id === tip.id);
  const prevTip = tipIndex > 0 ? allTips[tipIndex - 1] : null;
  const nextTip = tipIndex >= 0 && tipIndex < allTips.length - 1 ? allTips[tipIndex + 1] : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-14">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#57534E] hover:text-[#18181B] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to {CATEGORY_META[tip.category].label}</span>
        </button>

        {isSolved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E]">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Drill Completed</span>
          </span>
        )}
      </div>

      {/* Article Header */}
      <header className="max-w-3xl pb-8 border-b border-[#E4E0D8]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] mb-3">
          <span className="font-mono tabular-nums font-semibold text-[#18181B]">Tip {tip.number}</span>
          <span aria-hidden="true">·</span>
          <span>{CATEGORY_META[tip.category].label}</span>
          <span aria-hidden="true">·</span>
          <span>{tip.level}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{tip.readMinutes} min study</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-[#18181B] leading-[1.15]">
          {tip.title}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-[#57534E] leading-relaxed">
          {tip.subtitle}
        </p>
      </header>

      {/* Two-Zone Interactive Stage */}
      <section className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Zone: Board & Mode Toolbar */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {/* Segmented Mode Control */}
            <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8]">
              <button
                type="button"
                onClick={() => {
                  setMode('walkthrough');
                  setIsPlaying(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'walkthrough'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                Walkthrough
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setMode('drill');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'drill'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                Practice Drill
              </button>
              <button
                type="button"
                onClick={enterExploreMode}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'explore'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                Free Explore
              </button>
            </div>

            {/* Utility Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Flip board perspective"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Flip Board</span>
              </button>
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Mute board sounds' : 'Enable board sounds'}
                className="inline-flex items-center justify-center w-8 h-8 text-[#57534E] bg-white border border-[#E4E0D8] rounded-sm hover:text-[#18181B] hover:border-[#C8C2B6] transition-colors cursor-pointer"
                title={soundEnabled ? 'Sound on' : 'Sound muted'}
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
            state={activeBoardState}
            orientation={orientation}
            interactive={mode !== 'walkthrough'}
            onMove={mode === 'drill' ? handleDrillMove : handleExploreMove}
            lastMove={activeLastMove}
            highlights={activeHighlights}
            arrows={activeArrows}
            sizeClass="w-full max-w-[580px]"
          />

          {/* Turn Status Footer Bar */}
          <div className="mt-3 max-w-[580px] flex items-center justify-between text-xs text-[#57534E]">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-3 h-3 rounded-xs border border-[#18181B]/40 ${
                  activeBoardState.turn === 'w' ? 'bg-[#FAF8F3]' : 'bg-[#232326]'
                }`}
                aria-hidden="true"
              />
              <span className="font-medium text-[#18181B]">
                {activeBoardState.turn === 'w' ? 'White to move' : 'Black to move'}
              </span>
            </div>
            <span className="font-mono tabular-nums">
              {mode === 'walkthrough'
                ? `Step ${stepIndex} / ${walkthroughFrames.length - 1}`
                : mode === 'drill'
                ? 'Click a piece, then click its target square'
                : `Free variation · ${exploreHistory.length - 1} moves played`}
            </span>
          </div>
        </div>

        {/* Right Zone: Control & Concept Deck */}
        <div className="lg:col-span-5 bg-white border border-[#E4E0D8] rounded-sm p-6 md:p-7">
          {mode === 'walkthrough' && (
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EFECE4]">
                <h2 className="font-serif text-lg font-semibold text-[#18181B]">
                  Step-by-Step Sequence
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex(0);
                    }}
                    disabled={stepIndex === 0}
                    aria-label="Reset sequence"
                    className="p-2 rounded-sm border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:bg-[#F8F6F1] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex((i) => Math.max(0, i - 1));
                    }}
                    disabled={stepIndex === 0}
                    aria-label="Previous move"
                    className="p-2 rounded-sm border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:bg-[#F8F6F1] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (stepIndex >= walkthroughFrames.length - 1) {
                        setStepIndex(0);
                      }
                      setIsPlaying((p) => !p);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#1B4D3E] text-white text-xs font-semibold hover:bg-[#153E32] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex((i) => {
                        const next = Math.min(walkthroughFrames.length - 1, i + 1);
                        if (next !== i) playChessSound('move', soundEnabled);
                        return next;
                      });
                    }}
                    disabled={stepIndex >= walkthroughFrames.length - 1}
                    aria-label="Next move"
                    className="p-2 rounded-sm border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:bg-[#F8F6F1] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Clickable Move Sequence */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {walkthroughFrames.map((frame, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex(idx);
                      if (idx > 0) playChessSound('move', soundEnabled);
                    }}
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-sm border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      idx === stepIndex
                        ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                        : 'bg-[#F8F6F1] text-[#18181B] border-[#E4E0D8] hover:border-[#C8C2B6]'
                    }`}
                  >
                    {idx === 0 ? 'Start' : frame.step.san}
                  </button>
                ))}
              </div>

              {/* Active Step Annotation */}
              <div className="mt-6 pt-5 border-t border-[#EFECE4]">
                <h3 className="text-sm font-semibold text-[#18181B]">
                  {currentFrame.step.label}
                </h3>
                <p className="mt-2 text-sm text-[#3F3F46] leading-relaxed">
                  {currentFrame.step.explanation}
                </p>
              </div>

              {/* Prompt to try drill */}
              <div className="mt-6 pt-5 border-t border-[#EFECE4] flex items-center justify-between gap-4">
                <p className="text-xs text-[#57534E]">
                  Ready to spot the move yourself?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setMode('drill');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-[#1B4D3E] border border-[#1B4D3E] rounded-sm hover:bg-[#1B4D3E] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Try Practice Drill
                </button>
              </div>
            </div>
          )}

          {mode === 'drill' && (
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
                <h2 className="font-serif text-lg font-semibold text-[#18181B]">
                  Practice Drill
                </h2>
                <button
                  type="button"
                  onClick={resetDrill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] border border-[#E4E0D8] rounded-sm hover:bg-[#F8F6F1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Drill</span>
                </button>
              </div>

              <p className="mt-4 text-sm font-medium text-[#18181B] leading-relaxed">
                {tip.drill.prompt}
              </p>

              {drillStatus === 'idle' && (
                <p className="mt-2 text-xs text-[#57534E]">
                  Select a piece on the board and click the destination square to submit your move.
                </p>
              )}

              {drillStatus === 'correct' && (
                <div className="mt-4 p-4 rounded-sm border border-[#1B4D3E]/30 bg-[#1B4D3E]/8">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1B4D3E]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Correct Move — {tip.drill.solutionSan}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-[#18181B] leading-relaxed">
                    {drillFeedback}
                  </p>
                </div>
              )}

              {drillStatus === 'incorrect' && (
                <div className="mt-4 p-4 rounded-sm border border-[#B45309]/40 bg-[#B45309]/8">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#9A3412]">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Not the Best Move</span>
                  </div>
                  <p className="mt-1.5 text-sm text-[#18181B] leading-relaxed">
                    {drillFeedback}
                  </p>
                  <button
                    type="button"
                    onClick={resetDrill}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold bg-[#18181B] text-white rounded-sm hover:bg-[#27272A] transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {drillStatus === 'revealed' && (
                <div className="mt-4 p-4 rounded-sm border border-[#D4CFC5] bg-[#F8F6F1]">
                  <p className="text-sm font-semibold text-[#18181B]">Solution Shown</p>
                  <p className="mt-1 text-sm text-[#3F3F46] leading-relaxed">{drillFeedback}</p>
                </div>
              )}

              {showHint && drillStatus !== 'correct' && (
                <div className="mt-4 p-3.5 rounded-sm border border-[#E4E0D8] bg-[#F8F6F1]">
                  <p className="text-xs font-semibold text-[#18181B]">Hint</p>
                  <p className="mt-1 text-xs text-[#57534E] leading-relaxed">{tip.drill.hint}</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-[#EFECE4] flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#57534E] border border-[#E4E0D8] rounded-sm hover:text-[#18181B] hover:border-[#C8C2B6] transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>
                {drillStatus !== 'correct' && drillStatus !== 'revealed' && (
                  <button
                    type="button"
                    onClick={revealDrillSolution}
                    className="px-3 py-1.5 text-xs font-medium text-[#57534E] border border-[#E4E0D8] rounded-sm hover:text-[#18181B] hover:border-[#C8C2B6] transition-colors cursor-pointer"
                  >
                    Reveal Solution
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'explore' && (
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
                <h2 className="font-serif text-lg font-semibold text-[#18181B]">
                  Free Exploration
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (exploreHistory.length > 1) {
                        setExploreHistory((h) => h.slice(0, -1));
                      }
                    }}
                    disabled={exploreHistory.length <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-[#18181B] border border-[#E4E0D8] rounded-sm disabled:opacity-40 hover:bg-[#F8F6F1] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={enterExploreMode}
                    className="px-3 py-1.5 text-xs font-medium text-[#18181B] border border-[#E4E0D8] rounded-sm hover:bg-[#F8F6F1] transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#57534E] leading-relaxed">
                Test alternative replies for either White or Black from this board position. Only legal chess moves are permitted.
              </p>
              <div className="mt-4 min-h-[72px] p-3 bg-[#F8F6F1] border border-[#E4E0D8] rounded-sm">
                {exploreHistory.length <= 1 ? (
                  <p className="text-xs text-[#57534E]">No custom moves played yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {exploreHistory.slice(1).map((item, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono tabular-nums text-[#18181B]"
                      >
                        {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}
                        {item.san}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Core Summary */}
          <div className="mt-6 pt-5 border-t border-[#EFECE4]">
            <p className="text-xs font-semibold text-[#57534E] mb-1.5">Principle Overview</p>
            <p className="text-sm text-[#3F3F46] leading-relaxed">{tip.summary}</p>
          </div>
        </div>
      </section>

      {/* Checklist & Common Mistake Section */}
      <section className="mt-12 pt-10 border-t border-[#E4E0D8] grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7">
          <h2 className="font-serif text-2xl font-semibold text-[#18181B]">
            At-the-Board Checklist
          </h2>
          <ol className="mt-5 space-y-4">
            {tip.checklist.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3.5 text-sm text-[#3F3F46] leading-relaxed">
                <span className="font-mono tabular-nums text-xs font-semibold text-[#1B4D3E] pt-0.5">
                  0{idx + 1}.
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="md:col-span-5 bg-white border border-[#E4E0D8] rounded-sm p-6 self-start">
          <p className="text-xs font-semibold text-[#9A3412]">Common Mistake to Avoid</p>
          <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#18181B]">
            {tip.commonMistake.title}
          </h3>
          <p className="mt-2 text-sm text-[#57534E] leading-relaxed">
            {tip.commonMistake.detail}
          </p>
        </div>
      </section>

      {/* Previous / Next Tip Navigation */}
      <nav
        aria-label="Lesson pagination"
        className="mt-14 pt-8 border-t border-[#E4E0D8] grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {prevTip ? (
          <button
            type="button"
            onClick={() => onSelectTip(prevTip.id)}
            className="flex flex-col items-start p-5 bg-white border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors text-left cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-[#57534E]">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Previous Tip</span>
            </span>
            <span className="mt-1.5 font-serif text-base font-semibold text-[#18181B]">
              {prevTip.number}. {prevTip.title}
            </span>
          </button>
        ) : (
          <div />
        )}

        {nextTip && (
          <button
            type="button"
            onClick={() => onSelectTip(nextTip.id)}
            className="flex flex-col items-end p-5 bg-white border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors text-right cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-[#57534E]">
              <span>Next Tip</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="mt-1.5 font-serif text-base font-semibold text-[#18181B]">
              {nextTip.number}. {nextTip.title}
            </span>
          </button>
        )}
      </nav>
    </div>
  );
};
