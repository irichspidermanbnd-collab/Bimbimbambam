import React, { useMemo, useState } from 'react';
import { CATEGORY_META, ChessTip, TipCategory, TipLevel } from '../data/chessTips';
import { EditorialImage } from './EditorialImage';
import { TipCard } from './TipCard';

interface CategoryPageProps {
  category: TipCategory;
  tips: ChessTip[];
  solvedIds: string[];
  onSelectTip: (tipId: string) => void;
}

const LEVEL_FILTERS: ('All' | TipLevel)[] = ['All', 'Foundations', 'Intermediate', 'Advanced'];

export const CategoryPage: React.FC<CategoryPageProps> = ({
  category,
  tips,
  solvedIds,
  onSelectTip,
}) => {
  const [levelFilter, setLevelFilter] = useState<'All' | TipLevel>('All');
  const meta = CATEGORY_META[category];

  const categoryTips = useMemo(
    () => tips.filter((t) => t.category === category),
    [tips, category]
  );

  const filteredTips = useMemo(() => {
    if (levelFilter === 'All') return categoryTips;
    return categoryTips.filter((t) => t.level === levelFilter);
  }, [categoryTips, levelFilter]);

  const solvedCount = categoryTips.filter((t) => solvedIds.includes(t.id)).length;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
      {/* Category Editorial Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch pb-12 border-b border-[#E4E0D8]">
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#57534E] mb-3">
              <span>Chapter</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{categoryTips.length} Interactive Lessons</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {solvedCount} of {categoryTips.length} Drills Solved
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-[#18181B] leading-[1.12]">
              {meta.headline}
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed max-w-2xl">
              {meta.intro}
            </p>
          </div>

          {/* Interactive Filter Tabs */}
          <div className="mt-8 pt-6 border-t border-[#EFECE4] flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8]">
              {LEVEL_FILTERS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    levelFilter === lvl
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {lvl === 'All' ? 'All Levels' : lvl}
                </button>
              ))}
            </div>

            <span className="text-xs text-[#57534E] tabular-nums">
              Showing {filteredTips.length} {filteredTips.length === 1 ? 'tip' : 'tips'}
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <EditorialImage
            src={meta.image}
            alt={meta.imageAlt}
            aspectClass="aspect-[4/3] lg:h-full"
            className="lg:h-full"
          />
        </div>
      </section>

      {/* Filtered Tips Grid */}
      <section className="mt-10">
        {filteredTips.length === 0 ? (
          <div className="p-10 bg-white border border-[#E4E0D8] rounded-sm text-center">
            <p className="text-sm text-[#57534E]">
              No lessons match the {levelFilter} filter in {meta.label}.
            </p>
            <button
              type="button"
              onClick={() => setLevelFilter('All')}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-[#1B4D3E] text-white rounded-sm hover:bg-[#153E32] transition-colors cursor-pointer"
            >
              Show All Levels
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTips.map((tip) => (
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
