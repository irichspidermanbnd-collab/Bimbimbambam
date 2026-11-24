import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookmarkCheck,
  BookmarkPlus,
  Clock,
  Download,
  Flag,
  RefreshCw,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ChessState,
  Color,
  getLegalMoves,
  isKingInCheck,
  makeMove,
  Move,
  parseFen,
  PieceType,
  STARTING_FEN,
} from '../lib/chess';
import { formatPgnFromSans, saveGameToArchive, triggerPgnDownload } from '../lib/api';
import { BOT_LEVELS, BotDifficulty, findBestMove } from '../lib/engine';
import { playChessSound } from '../lib/sound';
import { ChessBoard } from './ChessBoard';

interface HistoryEntry {
  state: ChessState;
  move?: Move;
  san?: string;
  lastMove: { from: string; to: string } | null;
}

type TimeControlKey = 'unlimited' | 'rapid' | 'blitz' | 'bullet';

const TIME_CONTROLS: Record<TimeControlKey, { label: string; seconds: number }> = {
  unlimited: { label: 'Unlimited', seconds: 0 },
  rapid: { label: '10 min', seconds: 600 },
  blitz: { label: '5 min', seconds: 300 },
  bullet: { label: '3 min', seconds: 180 },
};

interface PlayBotViewProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSendToAnalysis: (initialFen: string, moves: Move[], title: string, savedGameId?: string) => void;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PlayBotView: React.FC<PlayBotViewProps> = ({
  soundEnabled,
  onToggleSound,
  onSendToAnalysis,
}) => {
  const [difficulty, setDifficulty] = useState<BotDifficulty>('tactician');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [orientation, setOrientation] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControlKey>('rapid');
  const [clocks, setClocks] = useState<{ w: number; b: number }>({ w: 600, b: 600 });
  const [flaggedBy, setFlaggedBy] = useState<Color | null>(null);
  const [resignedBy, setResignedBy] = useState<Color | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    { state: parseFen(STARTING_FEN), lastMove: null },
  ]);

  const botTimerRef = useRef<number | null>(null);

  const currentEntry = history[history.length - 1];
  const currentState = currentEntry.state;
  const botColor: Color = playerColor === 'w' ? 'b' : 'w';

  const gameOutcome = useMemo(() => {
    if (flaggedBy) {
      return {
        over: true,
        result: flaggedBy === 'w' ? '0–1' : '1–0',
        label: `${flaggedBy === 'w' ? 'White' : 'Black'} ran out of time — ${
          flaggedBy === 'w' ? 'Black' : 'White'
        } wins`,
      };
    }

    if (resignedBy) {
      return {
        over: true,
        result: resignedBy === 'w' ? '0–1' : '1–0',
        label: `${resignedBy === 'w' ? 'White' : 'Black'} resigned — ${
          resignedBy === 'w' ? 'Black' : 'White'
        } wins`,
      };
    }

    const legal = getLegalMoves(currentState);
    const inCheck = isKingInCheck(currentState.board, currentState.turn);
    if (legal.length === 0) {
      if (inCheck) {
        const winner = currentState.turn === 'w' ? 'Black' : 'White';
        return {
          over: true,
          result: currentState.turn === 'w' ? '0–1' : '1–0',
          label: `Checkmate — ${winner} wins`,
        };
      }
      return {
        over: true,
        result: '½–½',
        label: 'Stalemate — Drawn game',
      };
    }

    if (currentState.halfmove >= 100) {
      return {
        over: true,
        result: '½–½',
        label: 'Draw by 50-move rule',
      };
    }

    return {
      over: false,
      result: '*',
      label: inCheck
        ? `${currentState.turn === 'w' ? 'White' : 'Black'} is in check`
        : `${currentState.turn === 'w' ? 'White' : 'Black'} to move`,
    };
  }, [currentState, resignedBy, flaggedBy]);

  const clearBotTimer = () => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearBotTimer();
  }, []);

  // Chess clock interval (starts once at least 1 move has been played)
  useEffect(() => {
    if (timeControl === 'unlimited' || gameOutcome.over || history.length <= 1) return;
    const turn = currentState.turn;
    const interval = window.setInterval(() => {
      setClocks((prev) => {
        const nextVal = Math.max(0, prev[turn] - 1);
        if (nextVal === 0) {
          setFlaggedBy(turn);
        }
        return { ...prev, [turn]: nextVal };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timeControl, gameOutcome.over, history.length, currentState.turn]);

  // Trigger bot move automatically whenever it is botColor's turn and game is active
  useEffect(() => {
    if (gameOutcome.over || currentState.turn !== botColor) {
      setIsBotThinking(false);
      return;
    }

    setIsBotThinking(true);
    clearBotTimer();

    const cfg = BOT_LEVELS[difficulty];
    botTimerRef.current = window.setTimeout(() => {
      const result = findBestMove(currentState, cfg.depth, true, cfg.noise);
      if (result) {
        const applied = makeMove(currentState, result.bestMove);
        if (applied.isCheckmate) {
          playChessSound('success', soundEnabled);
        } else if (applied.isCheck) {
          playChessSound('check', soundEnabled);
        } else if (result.bestMove.isCapture) {
          playChessSound('capture', soundEnabled);
        } else {
          playChessSound('move', soundEnabled);
        }

        setHistory((prev) => [
          ...prev,
          {
            state: applied.nextState,
            move: result.bestMove,
            san: applied.san,
            lastMove: { from: result.bestMove.from, to: result.bestMove.to },
          },
        ]);
      }
      setIsBotThinking(false);
      botTimerRef.current = null;
    }, 550);

    return () => clearBotTimer();
  }, [currentState, botColor, difficulty, gameOutcome.over, soundEnabled]);

  const startNewGame = (nextColor: Color = playerColor, nextTime: TimeControlKey = timeControl) => {
    clearBotTimer();
    setIsBotThinking(false);
    setResignedBy(null);
    setFlaggedBy(null);
    setSavedGameId(null);
    setPlayerColor(nextColor);
    setOrientation(nextColor);
    setTimeControl(nextTime);
    const secs = TIME_CONTROLS[nextTime].seconds;
    setClocks({ w: secs, b: secs });
    setHistory([{ state: parseFen(STARTING_FEN), lastMove: null }]);
  };

  const handlePlayerMove = (move: Move) => {
    if (gameOutcome.over || currentState.turn !== playerColor || isBotThinking) return;
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

    setSavedGameId(null);
    setHistory((prev) => [
      ...prev,
      {
        state: res.nextState,
        move,
        san: res.san,
        lastMove: { from: move.from, to: move.to },
      },
    ]);
  };

  const handleTakeBack = () => {
    clearBotTimer();
    setIsBotThinking(false);
    setResignedBy(null);
    setFlaggedBy(null);
    setSavedGameId(null);
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      if (prev[prev.length - 1].state.turn === playerColor && prev.length >= 3) {
        return prev.slice(0, -2);
      }
      return prev.slice(0, -1);
    });
  };

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

  const sansList = useMemo(
    () => history.slice(1).map((h) => h.san || '').filter(Boolean),
    [history]
  );

  const movePairs = useMemo(() => {
    const pairs: { num: number; white: string; black?: string }[] = [];
    for (let i = 0; i < sansList.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: sansList[i],
        black: sansList[i + 1],
      });
    }
    return pairs;
  }, [sansList]);

  const playedMoves = useMemo(
    () => history.slice(1).map((h) => h.move!).filter(Boolean),
    [history]
  );

  const botInfo = BOT_LEVELS[difficulty];
  const gameTitle = `Player vs. ${botInfo.label} Bot (${botInfo.rating})`;

  const buildCurrentPgn = () => {
    const pgnResult = gameOutcome.result.replace(/–/g, '-').replace('½', '1/2');
    return formatPgnFromSans(sansList, {
      event: 'Chess Tips!, Analysis! Bot Match',
      white: playerColor === 'w' ? 'Player' : `${botInfo.label} Bot (${botInfo.rating})`,
      black: playerColor === 'b' ? 'Player' : `${botInfo.label} Bot (${botInfo.rating})`,
      result: pgnResult === '1/2-1/2' || pgnResult === '1-0' || pgnResult === '0-1' ? pgnResult : '*',
    });
  };

  const handleSaveToArchive = async () => {
    if (playedMoves.length < 2 || isSaving || savedGameId) return;
    setIsSaving(true);
    const saved = await saveGameToArchive({
      title: gameTitle,
      pgn: buildCurrentPgn(),
      result: gameOutcome.result,
      playerColor,
      botLevel: `${botInfo.label} (${botInfo.rating})`,
      movesCount: playedMoves.length,
    });
    if (saved) {
      setSavedGameId(saved.id);
    }
    setIsSaving(false);
  };

  const topColor: Color = orientation === 'w' ? 'b' : 'w';
  const bottomColor: Color = orientation;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      {/* Left Zone: Board & Clocks */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-[580px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTakeBack}
              disabled={history.length <= 1 || isBotThinking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] rounded-sm disabled:opacity-40 hover:border-[#C8C2B6] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Take Back</span>
            </button>

            <button
              type="button"
              onClick={() => startNewGame(playerColor)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Game</span>
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
            {!gameOutcome.over && history.length > 1 && (
              <button
                type="button"
                onClick={() => setResignedBy(playerColor)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9A3412] bg-white border border-[#E4E0D8] rounded-sm hover:border-[#9A3412]/50 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Resign</span>
              </button>
            )}
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

        {/* Top Player Strip & Clock */}
        <div className="max-w-[580px] flex items-center justify-between px-3 py-2 mb-2 bg-white border border-[#E4E0D8] rounded-sm">
          <div className="flex items-center gap-2.5 text-xs font-medium text-[#18181B]">
            {topColor === botColor && (
              <img
                src="/assets/aistudio/IMG_0784_675c4388.png"
                alt={`${botInfo.label} Bot`}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-xs object-cover border border-[#E4E0D8]"
              />
            )}
            <span
              className={`inline-block w-3 h-3 rounded-xs border border-[#18181B]/40 ${
                topColor === 'w' ? 'bg-[#FAF8F3]' : 'bg-[#232326]'
              }`}
              aria-hidden="true"
            />
            <span>
              {topColor === botColor
                ? `${botInfo.label} Bot (${botInfo.rating})`
                : 'You'}
            </span>
          </div>
          {timeControl !== 'unlimited' && (
            <span
              className={`font-mono text-sm font-semibold tabular-nums px-2 py-0.5 rounded-xs ${
                currentState.turn === topColor && !gameOutcome.over
                  ? 'bg-[#1B4D3E] text-white'
                  : 'text-[#57534E]'
              }`}
            >
              {formatClock(clocks[topColor])}
            </span>
          )}
        </div>

        <ChessBoard
          state={currentState}
          orientation={orientation}
          interactive={!gameOutcome.over && currentState.turn === playerColor && !isBotThinking}
          onMove={handlePlayerMove}
          lastMove={currentEntry.lastMove}
          sizeClass="w-full max-w-[580px]"
        />

        {/* Bottom Player Strip & Clock */}
        <div className="max-w-[580px] flex items-center justify-between px-3 py-2 mt-2 bg-white border border-[#E4E0D8] rounded-sm">
          <div className="flex items-center gap-2.5 text-xs font-medium text-[#18181B]">
            {bottomColor === botColor && (
              <img
                src="/assets/aistudio/IMG_0784_675c4388.png"
                alt={`${botInfo.label} Bot`}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-xs object-cover border border-[#E4E0D8]"
              />
            )}
            <span
              className={`inline-block w-3 h-3 rounded-xs border border-[#18181B]/40 ${
                bottomColor === 'w' ? 'bg-[#FAF8F3]' : 'bg-[#232326]'
              }`}
              aria-hidden="true"
            />
            <span>
              {bottomColor === botColor
                ? `${botInfo.label} Bot (${botInfo.rating})`
                : 'You'}
            </span>
          </div>
          {timeControl !== 'unlimited' && (
            <span
              className={`font-mono text-sm font-semibold tabular-nums px-2 py-0.5 rounded-xs ${
                currentState.turn === bottomColor && !gameOutcome.over
                  ? 'bg-[#1B4D3E] text-white'
                  : 'text-[#57534E]'
              }`}
            >
              {formatClock(clocks[bottomColor])}
            </span>
          )}
        </div>

        {/* Turn & Material Status */}
        <div className="mt-2.5 max-w-[580px] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#18181B]">
            {isBotThinking
              ? `${botInfo.label} Bot (${botInfo.rating}) is calculating...`
              : gameOutcome.label}
          </span>
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

      {/* Right Zone: Bot Settings, Game Result & Move List */}
      <div className="lg:col-span-5 space-y-6">
        {gameOutcome.over && (
          <div className="bg-white border border-[#1B4D3E]/40 rounded-sm p-6">
            <p className="text-xs font-semibold text-[#1B4D3E]">Game Complete · {gameOutcome.result}</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#18181B]">
              {gameOutcome.label}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => startNewGame(playerColor)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-sm hover:bg-[#153E32] transition-colors cursor-pointer"
              >
                Play Again
              </button>
              {playedMoves.length >= 2 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onSendToAnalysis(
                        STARTING_FEN,
                        playedMoves,
                        gameTitle,
                        savedGameId ?? undefined
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B4D3E] border border-[#1B4D3E] rounded-sm hover:bg-[#1B4D3E] hover:text-white transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Analyze Game</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToArchive}
                    disabled={isSaving || Boolean(savedGameId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#18181B] border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] disabled:opacity-70 transition-colors cursor-pointer"
                  >
                    {savedGameId ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-[#1B4D3E]" aria-hidden="true" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{isSaving ? 'Saving...' : 'Save to Archive'}</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Opponent Strength, Side & Time Control */}
        <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
          <h2 className="font-serif text-lg font-semibold text-[#18181B]">
            Match Setup
          </h2>

          <div className="mt-4">
            <p className="text-xs font-medium text-[#57534E] mb-2">Bot Strength</p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8]">
              {(['club', 'tactician', 'master'] as BotDifficulty[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`px-2 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                    difficulty === lvl
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {BOT_LEVELS[lvl].label} · {BOT_LEVELS[lvl].rating}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#57534E] leading-relaxed">
              {botInfo.description}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-[#EFECE4]">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#57534E] mb-2">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Time Control</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8]">
              {(['unlimited', 'rapid', 'blitz', 'bullet'] as TimeControlKey[]).map((tc) => (
                <button
                  key={tc}
                  type="button"
                  onClick={() => startNewGame(playerColor, tc)}
                  className={`px-2 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                    timeControl === tc
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {TIME_CONTROLS[tc].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#EFECE4] flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-[#57534E]">Play As</span>
            <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE4] rounded-md border border-[#E4E0D8]">
              <button
                type="button"
                onClick={() => startNewGame('w')}
                className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  playerColor === 'w'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => startNewGame('b')}
                className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  playerColor === 'b'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                Black
              </button>
            </div>
          </div>
        </div>

        {/* Move History & Export */}
        <div className="bg-white border border-[#E4E0D8] rounded-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-[#18181B]">
              Game Moves
            </h2>
            {playedMoves.length >= 2 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerPgnDownload('chess-tips-game.pgn', buildCurrentPgn())}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#57534E] hover:text-[#18181B] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>PGN</span>
                </button>
                {!gameOutcome.over && (
                  <button
                    type="button"
                    onClick={() =>
                      onSendToAnalysis(STARTING_FEN, playedMoves, gameTitle)
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4D3E] hover:underline underline-offset-4 cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Analyze</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 max-h-[220px] overflow-y-auto border border-[#EFECE4] rounded-sm bg-[#F8F6F1]">
            {movePairs.length === 0 ? (
              <p className="p-4 text-xs text-[#57534E]">
                {playerColor === 'w'
                  ? 'Make your opening move on the board to begin.'
                  : 'Bot is preparing White’s opening move...'}
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
};
