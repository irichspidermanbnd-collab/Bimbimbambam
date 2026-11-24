import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CATEGORY_META, ChessTip } from '../data/chessTips';
import { applyUciMove, parseFen } from '../lib/chess';
import { ChessBoard } from './ChessBoard';

interface TipCardProps {
  tip: ChessTip;
  solved?: boolean;
  onSelect: (tipId: string) => void;
}

export const TipCard: React.FC<TipCardProps> = ({ tip, solved = false, onSelect }) => {
  const preview = useMemo(() => {
    let state = parseFen(tip.initialFen);
    let lastMove: { from: string; to: string } | null = null;
    // Advance to the key illustrative move (step 1) so the diagram immediately illustrates the concept
    const firstMoveStep = tip.steps.find((s) => Boolean(s.uci));
    if (firstMoveStep?.uci) {
      const res = applyUciMove(state, firstMoveStep.uci);
      if (res) {
        state = res.nextState;
        lastMove = { from: firstMoveStep.uci.slice(0, 2), to: firstMoveStep.uci.slice(2, 4) };
      }
    }
    return {
      state,
      lastMove,
      highlights: firstMoveStep?.highlights ?? tip.steps[0]?.highlights ?? [],
      arrows: firstMoveStep?.arrows ?? tip.steps[0]?.arrows ?? [],
    };
  }, [tip]);

  return (
    <article className="group flex flex-col bg-white border border-[#E4E0D8] rounded-sm transition-colors duration-150 hover:border-[#C8C2B6]">
      <button
        type="button"
        onClick={() => onSelect(tip.id)}
        className="flex flex-col flex-1 text-left p-6 focus-visible:outline-offset-[-2px] cursor-pointer"
      >
        <div className="flex items-center justify-between gap-3 text-xs text-[#57534E] mb-3">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="font-mono tabular-nums font-medium text-[#18181B]">{tip.number}</span>
            <span aria-hidden="true">·</span>
            <span>{CATEGORY_META[tip.category].label}</span>
            <span aria-hidden="true">·</span>
            <span>{tip.level}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{tip.readMinutes} min</span>
          </div>
          {solved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Solved</span>
            </span>
          )}
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#18181B] leading-snug group-hover:text-[#1B4D3E] transition-colors">
          {tip.title}
        </h3>

        <p className="mt-2 text-sm text-[#57534E] leading-relaxed line-clamp-2 flex-1">
          {tip.subtitle}
        </p>

        <div className="mt-5 pt-5 border-t border-[#EFECE4] flex items-center gap-5">
          <div className="w-28 shrink-0 pointer-events-none">
            <ChessBoard
              state={preview.state}
              orientation={tip.orientation}
              interactive={false}
              showCoordinates={false}
              lastMove={preview.lastMove}
              highlights={preview.highlights}
              arrows={preview.arrows}
              sizeClass="w-28"
            />
          </div>
          <div className="flex flex-col justify-between min-w-0 flex-1">
            <p className="text-xs text-[#57534E] leading-relaxed line-clamp-3">
              {tip.summary}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E] group-hover:translate-x-0.5 transition-transform">
              <span>Study lesson &amp; drill</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
};
