import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { CATEGORY_META, ChessTip, TipCategory } from '../data/chessTips';
import { applyUciMove, ChessState, parseFen } from '../lib/chess';
import { playChessSound } from '../lib/sound';
import { ChessBoard } from './ChessBoard';
import { EditorialImage } from './EditorialImage';
import { TipCard } from './TipCard';

interface OverviewPageProps {
  tips: ChessTip[];
  solvedIds: string[];
  soundEnabled: boolean;
  onNavigateCategory: (cat: TipCategory) => void;
  onNavigateStudy: () => void;
  onNavigateBot: () => void;
  onNavigateAnalysis: () => void;
  onSelectTip: (tipId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  tips,
  solvedIds,
  soundEnabled,
  onNavigateCategory,
  onNavigateStudy,
  onNavigateBot,
  onNavigateAnalysis,
  onSelectTip,
}) => {
  const [indexFilter, setIndexFilter] = useState<'all' | TipCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Featured interactive mini-lesson on the front page (Tip 05: Knight Fork)
  const featuredTip = useMemo(
    () => tips.find((t) => t.id === 'knight-fork') ?? tips[0],
    [tips]
  );
  const [spotStep, setSpotStep] = useState(1);

  const spotlightFrames = useMemo(() => {
    const frames: {
      state: ChessState;
      lastMove: { from: string; to: string } | null;
      step: ChessTip['steps'][number];
    }[] = [];
    let current = parseFen(featuredTip.initialFen);
    frames.push({ state: current, lastMove: null, step: featuredTip.steps[0] });
    for (let i = 1; i < featuredTip.steps.length; i++) {
      const s = featuredTip.steps[i];
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
  }, [featuredTip]);

  const activeSpot = spotlightFrames[spotStep] || spotlightFrames[0];

  const visibleTips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tips.filter((t) => {
      if (indexFilter !== 'all' && t.category !== indexFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.level.toLowerCase().includes(q)
      );
    });
  }, [tips, indexFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      openings: tips.filter((t) => t.category === 'openings').length,
      tactics: tips.filter((t) => t.category === 'tactics').length,
      endgames: tips.filter((t) => t.category === 'endgames').length,
    };
  }, [tips]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-16">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between py-2">
          <div>
            <p className="text-xs text-[#57534E] mb-4">
              Chess Handbook · 12 Interactive Lessons &amp; Board Drills
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[52px] font-semibold tracking-tight text-[#18181B] leading-[1.1]">
              Play with purpose from move one to the endgame.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl">
              Practical chess principles taught directly on an interactive board. Walk through classic openings, spot forcing tactical patterns, and calculate pawn endgames without guesswork.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={onNavigateBot}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1B4D3E] rounded-sm hover:bg-[#153E32] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Play vs Bot</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNavigateAnalysis}
              className="text-sm font-semibold text-[#18181B] underline decoration-[#D4CFC5] underline-offset-4 hover:decoration-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Game Analysis
            </button>
            <button
              type="button"
              onClick={onNavigateStudy}
              className="text-sm font-medium text-[#57534E] hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Study Board
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <EditorialImage
            src="/src/assets/images/hero_chess_study_1795487743337.jpg"
            alt="Walnut and boxwood Staunton wooden chess set beside an analog chess clock in morning library light"
            aspectClass="aspect-[16/10] lg:h-full"
            className="lg:h-full"
          />
        </div>
      </section>

      {/* 4-Column Curriculum Strip */}
      <section
        aria-label="Curriculum chapters"
        className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#E4E0D8] bg-white rounded-sm divide-y sm:divide-y-0 sm:divide-x divide-[#E4E0D8]"
      >
        <button
          type="button"
          onClick={() => onNavigateCategory('openings')}
          className="p-5 text-left hover:bg-[#F8F6F1] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#57534E]">Chapter 01</p>
          <p className="mt-1 font-serif text-lg font-semibold text-[#18181B]">Openings</p>
          <p className="mt-1 text-xs text-[#57534E] tabular-nums">
            {categoryCounts.openings} principles · Center &amp; safety
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateCategory('tactics')}
          className="p-5 text-left hover:bg-[#F8F6F1] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#57534E]">Chapter 02</p>
          <p className="mt-1 font-serif text-lg font-semibold text-[#18181B]">Tactics</p>
          <p className="mt-1 text-xs text-[#57534E] tabular-nums">
            {categoryCounts.tactics} patterns · Forks, pins &amp; checks
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateCategory('endgames')}
          className="p-5 text-left hover:bg-[#F8F6F1] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#57534E]">Chapter 03</p>
          <p className="mt-1 font-serif text-lg font-semibold text-[#18181B]">Endgames</p>
          <p className="mt-1 text-xs text-[#57534E] tabular-nums">
            {categoryCounts.endgames} essentials · Opposition &amp; rooks
          </p>
        </button>

        <button
          type="button"
          onClick={onNavigateStudy}
          className="p-5 text-left hover:bg-[#F8F6F1] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#57534E]">Practice Progress</p>
          <p className="mt-1 font-serif text-lg font-semibold text-[#1B4D3E] tabular-nums">
            {solvedIds.length} / {tips.length} Solved
          </p>
          <p className="mt-1 text-xs text-[#57534E]">
            Interactive drills &amp; sandbox
          </p>
        </button>
      </section>

      {/* Featured Interactive Tip Spotlight */}
      <section className="mt-16 pt-12 border-t border-[#E4E0D8]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-[#57534E] mb-1.5">
              Featured Study · Tip {featuredTip.number} · {CATEGORY_META[featuredTip.category].label}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#18181B]">
              {featuredTip.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onSelectTip(featuredTip.id)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4D3E] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open full lesson &amp; drill</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-white border border-[#E4E0D8] rounded-sm p-6 md:p-8">
          <div className="lg:col-span-6 flex justify-center lg:justify-start">
            <ChessBoard
              state={activeSpot.state}
              orientation={featuredTip.orientation}
              interactive={false}
              lastMove={activeSpot.lastMove}
              highlights={activeSpot.step.highlights ?? []}
              arrows={activeSpot.step.arrows ?? []}
              sizeClass="w-full max-w-[440px]"
            />
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
                <span className="font-mono text-xs font-medium text-[#57534E] tabular-nums">
                  Step {spotStep} / {spotlightFrames.length - 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSpotStep(0)}
                    disabled={spotStep === 0}
                    aria-label="Reset spotlight sequence"
                    className="p-2 rounded-sm border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:bg-[#F8F6F1] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpotStep((s) => Math.max(0, s - 1))}
                    disabled={spotStep === 0}
                    aria-label="Previous spotlight move"
                    className="p-2 rounded-sm border border-[#E4E0D8] text-[#18181B] disabled:opacity-40 hover:bg-[#F8F6F1] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSpotStep((s) => {
                        const next = Math.min(spotlightFrames.length - 1, s + 1);
                        if (next !== s) playChessSound('move', soundEnabled);
                        return next;
                      });
                    }}
                    disabled={spotStep >= spotlightFrames.length - 1}
                    aria-label="Next spotlight move"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm bg-[#1B4D3E] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#153E32] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Next Move</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {spotlightFrames.map((frame, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSpotStep(idx);
                      if (idx > 0) playChessSound('move', soundEnabled);
                    }}
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-sm border transition-colors cursor-pointer ${
                      idx === spotStep
                        ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                        : 'bg-[#F8F6F1] text-[#18181B] border-[#E4E0D8] hover:border-[#C8C2B6]'
                    }`}
                  >
                    {idx === 0 ? 'Setup' : frame.step.san}
                  </button>
                ))}
              </div>

              <h3 className="mt-6 font-serif text-xl font-semibold text-[#18181B]">
                {activeSpot.step.label}
              </h3>
              <p className="mt-2 text-sm text-[#3F3F46] leading-relaxed">
                {activeSpot.step.explanation}
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-[#EFECE4] flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-[#57534E]">
                Test this motif yourself in the interactive drill.
              </p>
              <button
                type="button"
                onClick={() => onSelectTip(featuredTip.id)}
                className="px-4 py-2 text-xs font-semibold text-[#1B4D3E] border border-[#1B4D3E] rounded-sm hover:bg-[#1B4D3E] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Solve This Tactic
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Tip Index */}
      <section className="mt-16 pt-12 border-t border-[#E4E0D8]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-[#57534E] mb-1.5">Complete Archive</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#18181B]">
              All Chess Tips &amp; Drills
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tips..."
                aria-label="Search chess tips"
                className="pl-8 pr-3 py-1.5 w-48 sm:w-56 text-xs bg-white border border-[#E4E0D8] rounded-sm text-[#18181B] placeholder:text-[#78716C] focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8]">
              {(['all', 'openings', 'tactics', 'endgames'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setIndexFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    indexFilter === cat
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {cat === 'all' ? 'All Phases' : CATEGORY_META[cat].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleTips.length === 0 ? (
          <div className="p-10 bg-white border border-[#E4E0D8] rounded-sm text-center">
            <p className="text-sm text-[#57534E]">
              No chess tips match “{searchQuery}”.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIndexFilter('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-[#1B4D3E] text-white rounded-sm hover:bg-[#153E32] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleTips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                solved={solvedIds.includes(tip.id)}
                onSelect={onSelectTip}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
