export interface SavedGameRecord {
  id: string;
  title: string;
  pgn: string;
  result: string;
  playerColor?: 'w' | 'b';
  botLevel?: string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  movesCount: number;
  createdAt: string;
}

export async function fetchSavedGames(): Promise<SavedGameRecord[]> {
  try {
    const res = await fetch('/api/games');
    if (!res.ok) return [];
    const data = (await res.json()) as { games?: SavedGameRecord[] };
    return Array.isArray(data.games) ? data.games : [];
  } catch {
    return [];
  }
}

export async function fetchSavedGameById(id: string): Promise<SavedGameRecord | null> {
  try {
    const res = await fetch(`/api/games/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { game?: SavedGameRecord };
    return data.game ?? null;
  } catch {
    return null;
  }
}

export async function saveGameToArchive(payload: {
  title: string;
  pgn: string;
  result: string;
  playerColor?: 'w' | 'b';
  botLevel?: string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  movesCount: number;
}): Promise<SavedGameRecord | null> {
  try {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { game?: SavedGameRecord };
    return data.game ?? null;
  } catch {
    return null;
  }
}

export async function deleteSavedGame(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/games/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchProgress(): Promise<string[]> {
  try {
    const res = await fetch('/api/progress');
    if (!res.ok) return [];
    const data = (await res.json()) as { solvedTipIds?: string[] };
    return Array.isArray(data.solvedTipIds) ? data.solvedTipIds : [];
  } catch {
    return [];
  }
}

export async function saveTipSolved(tipId: string): Promise<string[]> {
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipId }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { solvedTipIds?: string[] };
    return Array.isArray(data.solvedTipIds) ? data.solvedTipIds : [];
  } catch {
    return [];
  }
}

export function formatPgnFromSans(
  sans: string[],
  headers: { white?: string; black?: string; result?: string; event?: string } = {}
): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const lines = [
    `[Event "${headers.event ?? 'Chess Tips!, Analysis! Game'}"]`,
    `[Date "${dateStr}"]`,
    `[White "${headers.white ?? 'Player'}"]`,
    `[Black "${headers.black ?? 'Bot'}"]`,
    `[Result "${headers.result ?? '*'}"]`,
    '',
  ];

  const moveTokens: string[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const w = sans[i];
    const b = sans[i + 1];
    moveTokens.push(b ? `${num}. ${w} ${b}` : `${num}. ${w}`);
  }
  if (headers.result && headers.result !== '*') {
    moveTokens.push(headers.result);
  }
  lines.push(moveTokens.join(' '));
  return lines.join('\n');
}

export function triggerPgnDownload(filename: string, pgnContent: string): void {
  const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
