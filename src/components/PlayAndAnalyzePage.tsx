import React, { useState } from 'react';
import { Move } from '../lib/chess';
import { GameAnalysisView, AnalysisJob } from './GameAnalysisView';
import { PlayBotView } from './PlayBotView';
import { StudyBoardPage } from './StudyBoardPage';

export type WorkspaceTab = 'bot' | 'analysis' | 'sandbox';

interface PlayAndAnalyzePageProps {
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  initialPresetId?: string;
  initialSharedGameId?: string;
}

export const PlayAndAnalyzePage: React.FC<PlayAndAnalyzePageProps> = ({
  activeTab,
  onChangeTab,
  soundEnabled,
  onToggleSound,
  initialPresetId,
  initialSharedGameId,
}) => {
  const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null);

  const handleSendToAnalysis = (
    initialFen: string,
    moves: Move[],
    title: string,
    savedRecordId?: string
  ) => {
    setAnalysisJob({
      id: `bot-game-${Date.now()}`,
      title,
      initialFen,
      moves,
      savedRecordId,
    });
    onChangeTab('analysis');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-14">
      <header className="pb-8 border-b border-[#E4E0D8] flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs text-[#57534E] mb-2">Interactive Chess Room</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#18181B]">
            {activeTab === 'bot'
              ? 'Play Against the Bot'
              : activeTab === 'analysis'
              ? 'Game Analysis'
              : 'Free Study Board'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#57534E] leading-relaxed">
            {activeTab === 'bot'
              ? 'Put opening, tactical, and endgame principles into practice against three bot skill levels, then review your game move by move.'
              : activeTab === 'analysis'
              ? 'Inspect move-by-move centipawn accuracy, spot missed tactics with engine arrows, or paste any PGN game to review.'
              : 'Load any lesson position or test free variations for both sides with full legal move checking.'}
          </p>
        </div>

        {/* Clean Segmented Mode Control */}
        <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8] self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onChangeTab('bot')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'bot'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#57534E] hover:text-[#18181B]'
            }`}
          >
            Play vs Bot
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('analysis')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#57534E] hover:text-[#18181B]'
            }`}
          >
            Game Analysis
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('sandbox')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#57534E] hover:text-[#18181B]'
            }`}
          >
            Study Board
          </button>
        </div>
      </header>

      <div className="mt-10">
        {activeTab === 'bot' && (
          <PlayBotView
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            onSendToAnalysis={handleSendToAnalysis}
          />
        )}

        {activeTab === 'analysis' && (
          <GameAnalysisView
            soundEnabled={soundEnabled}
            externalJob={analysisJob}
            initialSharedGameId={initialSharedGameId}
          />
        )}

        {activeTab === 'sandbox' && (
          <StudyBoardPage
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            initialPresetId={initialPresetId}
            embedded
          />
        )}
      </div>
    </div>
  );
};
