import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { CATEGORY_META, CHESS_TIPS, TipCategory } from './data/chessTips';
import { fetchProgress, saveTipSolved } from './lib/api';
import { CategoryPage } from './components/CategoryPage';
import { IdleBimBimBamBam } from './components/IdleBimBimBamBam';
import { OverviewPage } from './components/OverviewPage';
import { PlayAndAnalyzePage, WorkspaceTab } from './components/PlayAndAnalyzePage';
import { TipDetailPage } from './components/TipDetailPage';

type Route =
  | { page: 'overview' }
  | { page: 'category'; category: TipCategory }
  | { page: 'room'; tab: WorkspaceTab; presetId?: string; sharedGameId?: string }
  | { page: 'tip'; tipId: string };

const SOLVED_STORAGE_KEY = 'sixtyfour_solved_tips_v1';
const SITE_NAME = 'Chess Tips!, Analysis!';

function parseLocationToRoute(): Route {
  if (typeof window === 'undefined') return { page: 'overview' };

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const sharedGameId = params.get('game') || undefined;

  // Support legacy hash URLs smoothly
  if (pathname === '/' && window.location.hash) {
    const cleanHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (cleanHash === 'openings' || cleanHash === 'tactics' || cleanHash === 'endgames') {
      return { page: 'category', category: cleanHash };
    }
    if (cleanHash === 'play') return { page: 'room', tab: 'bot' };
    if (cleanHash === 'analysis') return { page: 'room', tab: 'analysis', sharedGameId };
    if (cleanHash === 'study') return { page: 'room', tab: 'sandbox' };
    if (cleanHash.startsWith('tip/')) {
      const tipId = cleanHash.slice('tip/'.length);
      if (CHESS_TIPS.some((t) => t.id === tipId)) return { page: 'tip', tipId };
    }
  }

  if (pathname === '/' || pathname === '/overview') return { page: 'overview' };
  if (pathname === '/openings') return { page: 'category', category: 'openings' };
  if (pathname === '/tactics') return { page: 'category', category: 'tactics' };
  if (pathname === '/endgames') return { page: 'category', category: 'endgames' };
  if (pathname === '/play') return { page: 'room', tab: 'bot' };
  if (pathname === '/analysis') return { page: 'room', tab: 'analysis', sharedGameId };
  if (pathname === '/study') return { page: 'room', tab: 'sandbox' };
  if (pathname.startsWith('/study/')) {
    return { page: 'room', tab: 'sandbox', presetId: pathname.slice('/study/'.length) };
  }
  if (pathname.startsWith('/tips/')) {
    const tipId = pathname.slice('/tips/'.length);
    if (CHESS_TIPS.some((t) => t.id === tipId)) {
      return { page: 'tip', tipId };
    }
  }
  return { page: 'overview' };
}

function routeToPath(route: Route): string {
  switch (route.page) {
    case 'overview':
      return '/';
    case 'category':
      return `/${route.category}`;
    case 'room':
      if (route.tab === 'bot') return '/play';
      if (route.tab === 'analysis') {
        return route.sharedGameId
          ? `/analysis?game=${encodeURIComponent(route.sharedGameId)}`
          : '/analysis';
      }
      return route.presetId ? `/study/${route.presetId}` : '/study';
    case 'tip':
      return `/tips/${route.tipId}`;
  }
}

function routeToPageTitle(route: Route): string {
  switch (route.page) {
    case 'overview':
      return `${SITE_NAME} — Chess Principles, Tactics & Endgame Study`;
    case 'category':
      return `${CATEGORY_META[route.category].label} — ${SITE_NAME}`;
    case 'room':
      if (route.tab === 'bot') return `Play vs. Bot — ${SITE_NAME}`;
      if (route.tab === 'analysis') return `Game Analysis — ${SITE_NAME}`;
      return `Study Board — ${SITE_NAME}`;
    case 'tip': {
      const tip = CHESS_TIPS.find((t) => t.id === route.tipId);
      return tip ? `${tip.title} — ${SITE_NAME}` : SITE_NAME;
    }
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseLocationToRoute());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [solvedIds, setSolvedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(SOLVED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Sync drill progress with server store
  useEffect(() => {
    fetchProgress().then((serverIds) => {
      if (serverIds.length === 0) return;
      setSolvedIds((prev) => {
        const merged = Array.from(new Set([...prev, ...serverIds]));
        try {
          window.localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore storage quota errors
        }
        return merged;
      });
    });
  }, []);

  // Update browser document title on route change
  useEffect(() => {
    document.title = routeToPageTitle(route);
  }, [route]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      setRoute(parseLocationToRoute());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (next: Route) => {
    setMobileMenuOpen(false);
    setRoute(next);
    const nextPath = routeToPath(next);
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleMarkSolved = (tipId: string) => {
    setSolvedIds((prev) => {
      if (prev.includes(tipId)) return prev;
      const updated = [...prev, tipId];
      try {
        window.localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota errors
      }
      return updated;
    });
    saveTipSolved(tipId).catch(() => {});
  };

  const activeTip =
    route.page === 'tip'
      ? CHESS_TIPS.find((t) => t.id === route.tipId) ?? CHESS_TIPS[0]
      : null;

  const isNavActive = (key: 'overview' | TipCategory | 'analysis') => {
    if (key === 'overview') return route.page === 'overview';
    if (key === 'analysis') return route.page === 'room' && route.tab === 'analysis';
    if (route.page === 'category') return route.category === key;
    if (route.page === 'tip' && activeTip) return activeTip.category === key;
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6F1] text-[#18181B]">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-[#F8F6F1]/95 backdrop-blur-xs border-b border-[#E4E0D8]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate({ page: 'overview' });
            }}
            className="font-serif text-xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0"
          >
            {SITE_NAME}
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'overview' });
              }}
              className={`whitespace-nowrap shrink-0 transition-colors underline-offset-4 hover:text-[#18181B] hover:underline ${
                isNavActive('overview') ? 'text-[#18181B] underline decoration-[#1B4D3E] decoration-2' : ''
              }`}
            >
              Overview
            </a>
            <a
              href="/openings"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'category', category: 'openings' });
              }}
              className={`whitespace-nowrap shrink-0 transition-colors underline-offset-4 hover:text-[#18181B] hover:underline ${
                isNavActive('openings') ? 'text-[#18181B] underline decoration-[#1B4D3E] decoration-2' : ''
              }`}
            >
              Openings
            </a>
            <a
              href="/tactics"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'category', category: 'tactics' });
              }}
              className={`whitespace-nowrap shrink-0 transition-colors underline-offset-4 hover:text-[#18181B] hover:underline ${
                isNavActive('tactics') ? 'text-[#18181B] underline decoration-[#1B4D3E] decoration-2' : ''
              }`}
            >
              Tactics
            </a>
            <a
              href="/endgames"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'category', category: 'endgames' });
              }}
              className={`whitespace-nowrap shrink-0 transition-colors underline-offset-4 hover:text-[#18181B] hover:underline ${
                isNavActive('endgames') ? 'text-[#18181B] underline decoration-[#1B4D3E] decoration-2' : ''
              }`}
            >
              Endgames
            </a>
            <a
              href="/analysis"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'room', tab: 'analysis' });
              }}
              className={`whitespace-nowrap shrink-0 transition-colors underline-offset-4 hover:text-[#18181B] hover:underline ${
                isNavActive('analysis') ? 'text-[#18181B] underline decoration-[#1B4D3E] decoration-2' : ''
              }`}
            >
              Analysis
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/play"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'room', tab: 'bot' });
              }}
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-sm hover:bg-[#153E32] transition-colors whitespace-nowrap shrink-0"
            >
              Play Bot
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 text-[#18181B] border border-[#E4E0D8] rounded-sm bg-white cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E4E0D8] bg-[#F8F6F1] px-6 py-4 space-y-2">
            {(
              [
                { label: 'Overview', href: '/', route: { page: 'overview' } as Route },
                { label: 'Openings', href: '/openings', route: { page: 'category', category: 'openings' } as Route },
                { label: 'Tactics', href: '/tactics', route: { page: 'category', category: 'tactics' } as Route },
                { label: 'Endgames', href: '/endgames', route: { page: 'category', category: 'endgames' } as Route },
                { label: 'Game Analysis', href: '/analysis', route: { page: 'room', tab: 'analysis' } as Route },
                { label: 'Study Board', href: '/study', route: { page: 'room', tab: 'sandbox' } as Route },
              ] as const
            ).map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.route);
                }}
                className="block w-full text-left py-2.5 text-sm font-medium text-[#18181B] border-b border-[#EFECE4] last:border-b-0"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/play"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'room', tab: 'bot' });
              }}
              className="block w-full text-center mt-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1B4D3E] rounded-sm"
            >
              Play Bot
            </a>
          </div>
        )}
      </header>

      {/* Active Page View */}
      <main className="flex-1">
        {route.page === 'overview' && (
          <OverviewPage
            tips={CHESS_TIPS}
            solvedIds={solvedIds}
            soundEnabled={soundEnabled}
            onNavigateCategory={(category) => navigate({ page: 'category', category })}
            onNavigateStudy={() => navigate({ page: 'room', tab: 'sandbox' })}
            onNavigateBot={() => navigate({ page: 'room', tab: 'bot' })}
            onNavigateAnalysis={() => navigate({ page: 'room', tab: 'analysis' })}
            onSelectTip={(tipId) => navigate({ page: 'tip', tipId })}
          />
        )}

        {route.page === 'category' && (
          <CategoryPage
            category={route.category}
            tips={CHESS_TIPS}
            solvedIds={solvedIds}
            onSelectTip={(tipId) => navigate({ page: 'tip', tipId })}
          />
        )}

        {route.page === 'tip' && activeTip && (
          <TipDetailPage
            tip={activeTip}
            allTips={CHESS_TIPS}
            isSolved={solvedIds.includes(activeTip.id)}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((s) => !s)}
            onMarkSolved={handleMarkSolved}
            onBack={() => navigate({ page: 'category', category: activeTip.category })}
            onSelectTip={(tipId) => navigate({ page: 'tip', tipId })}
          />
        )}

        {route.page === 'room' && (
          <PlayAndAnalyzePage
            activeTab={route.tab}
            onChangeTab={(tab) => navigate({ page: 'room', tab })}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((s) => !s)}
            initialPresetId={route.presetId}
            initialSharedGameId={route.sharedGameId}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="mt-16 border-t border-[#E4E0D8] bg-[#F3F0E8]">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#57534E]">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-semibold text-[#18181B]">{SITE_NAME}</span>
            <span aria-hidden="true">·</span>
            <span>Interactive Chess Principles, Bot Play &amp; Game Analysis</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="/openings"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'category', category: 'openings' });
              }}
              className="hover:text-[#18181B] transition-colors"
            >
              Openings
            </a>
            <a
              href="/tactics"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'category', category: 'tactics' });
              }}
              className="hover:text-[#18181B] transition-colors"
            >
              Tactics
            </a>
            <a
              href="/endgames"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'category', category: 'endgames' });
              }}
              className="hover:text-[#18181B] transition-colors"
            >
              Endgames
            </a>
            <a
              href="/play"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'room', tab: 'bot' });
              }}
              className="hover:text-[#18181B] transition-colors"
            >
              Play Bot
            </a>
            <a
              href="/analysis"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'room', tab: 'analysis' });
              }}
              className="hover:text-[#18181B] transition-colors"
            >
              Analysis
            </a>
            <a href="/sitemap.xml" className="hover:text-[#18181B] transition-colors">
              Sitemap
            </a>
          </div>
        </div>
      </footer>

      <IdleBimBimBamBam soundEnabled={soundEnabled} />
    </div>
  );
}
