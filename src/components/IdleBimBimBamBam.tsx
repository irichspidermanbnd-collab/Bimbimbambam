import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { playChessSound } from '../lib/sound';

const IDLE_TIMEOUT_MS = 60_000; // 1 minute
const REACTION_IMAGE = '/assets/aistudio/IMG_0784_675c4388.png';

interface IdleBimBimBamBamProps {
  soundEnabled: boolean;
}

function speakBimBimBamBam(soundEnabled: boolean): void {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('bim bim bam bam');
      utterance.rate = 1.05;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } else {
      playChessSound('check', true);
    }
  } catch {
    playChessSound('check', true);
  }
}

export const IdleBimBimBamBam: React.FC<IdleBimBimBamBamProps> = ({ soundEnabled }) => {
  const [triggered, setTriggered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const timerRef = useRef<number | null>(null);

  const scheduleIdleTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setTriggered(true);
      speakBimBimBamBam(soundEnabled);
    }, IDLE_TIMEOUT_MS);
  }, [soundEnabled]);

  useEffect(() => {
    if (triggered) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    scheduleIdleTimer();

    const onActivity = () => {
      scheduleIdleTimer();
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
    ];

    for (const evt of events) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      for (const evt of events) {
        window.removeEventListener(evt, onActivity);
      }
    };
  }, [triggered, scheduleIdleTimer]);

  const dismiss = useCallback(() => {
    setTriggered(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!triggered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggered, dismiss]);

  if (!triggered) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/60 backdrop-blur-xs p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bimbimbambam-title"
    >
      <div className="relative w-full max-w-sm bg-white border border-[#E4E0D8] rounded-sm p-6 shadow-xl text-center">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1.5 text-[#57534E] hover:text-[#18181B] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="mx-auto w-44 h-44 rounded-sm overflow-hidden border border-[#E4E0D8] bg-[#EFECE4]">
          {!imgFailed ? (
            <img
              src={REACTION_IMAGE}
              alt="Shocked chess streamer reaction"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#57534E] p-4">
              bimbimbambam
            </div>
          )}
        </div>

        <h2
          id="bimbimbambam-title"
          className="mt-5 font-serif text-3xl font-semibold tracking-tight text-[#18181B]"
        >
          bimbimbambam
        </h2>

        <p className="mt-2 text-sm text-[#57534E]">
          You stayed still for 1 minute! Time to make your next move.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => speakBimBimBamBam(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#18181B] bg-[#F8F6F1] border border-[#E4E0D8] rounded-sm hover:border-[#C8C2B6] transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Say Again</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-sm hover:bg-[#153E32] transition-colors cursor-pointer"
          >
            I&apos;m Back
          </button>
        </div>
      </div>
    </div>
  );
};
