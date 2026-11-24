import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

interface SavedGameRecord {
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

interface PersistedStore {
  games: SavedGameRecord[];
  solvedTipIds: string[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'chess-store.json');

function ensureStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      const initial: PersistedStore = { games: [], solvedTipIds: [] };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedStore>;
    return {
      games: Array.isArray(parsed.games) ? parsed.games : [],
      solvedTipIds: Array.isArray(parsed.solvedTipIds) ? parsed.solvedTipIds : [],
    };
  } catch {
    return { games: [], solvedTipIds: [] };
  }
}

function writeStore(store: PersistedStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

const TIP_SLUGS = [
  'control-the-center',
  'knights-before-bishops',
  'castle-early',
  'punish-early-queen',
  'knight-fork',
  'pin-and-pile',
  'skewer-tactic',
  'discovered-double-check',
  'rule-of-the-square',
  'king-opposition',
  'rook-behind-pawn',
  'philidor-defense',
];

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '256kb' }));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'chess-tips-analysis' });
  });

  // Saved Games Archive API
  app.get('/api/games', (_req, res) => {
    const store = ensureStore();
    res.json({ games: store.games });
  });

  app.get('/api/games/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = ensureStore();
    const game = store.games.find((g) => g.id === id);
    if (!game) {
      res.status(404).json({ error: 'Saved game not found.' });
      return;
    }
    res.json({ game });
  });

  app.post('/api/games', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
    const pgn = typeof body.pgn === 'string' ? body.pgn.trim().slice(0, 20000) : '';
    const result = typeof body.result === 'string' ? body.result.trim().slice(0, 16) : '*';
    const movesCount =
      typeof body.movesCount === 'number' && Number.isFinite(body.movesCount)
        ? Math.max(0, Math.min(1000, Math.floor(body.movesCount)))
        : 0;

    if (!title || !pgn) {
      res.status(400).json({ error: 'Both title and pgn are required.' });
      return;
    }

    const record: SavedGameRecord = {
      id: crypto.randomBytes(4).toString('hex'),
      title,
      pgn,
      result,
      playerColor: body.playerColor === 'w' || body.playerColor === 'b' ? body.playerColor : undefined,
      botLevel: typeof body.botLevel === 'string' ? body.botLevel.slice(0, 40) : undefined,
      whiteAccuracy:
        typeof body.whiteAccuracy === 'number' && Number.isFinite(body.whiteAccuracy)
          ? Math.max(0, Math.min(100, Math.round(body.whiteAccuracy)))
          : undefined,
      blackAccuracy:
        typeof body.blackAccuracy === 'number' && Number.isFinite(body.blackAccuracy)
          ? Math.max(0, Math.min(100, Math.round(body.blackAccuracy)))
          : undefined,
      movesCount,
      createdAt: new Date().toISOString(),
    };

    const store = ensureStore();
    store.games = [record, ...store.games].slice(0, 50);
    writeStore(store);

    res.status(201).json({ game: record });
  });

  app.delete('/api/games/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const store = ensureStore();
    const before = store.games.length;
    store.games = store.games.filter((g) => g.id !== id);
    if (store.games.length === before) {
      res.status(404).json({ error: 'Saved game not found.' });
      return;
    }
    writeStore(store);
    res.json({ deleted: id });
  });

  // Drill Progress API
  app.get('/api/progress', (_req, res) => {
    const store = ensureStore();
    res.json({ solvedTipIds: store.solvedTipIds });
  });

  app.post('/api/progress', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const tipId = typeof body.tipId === 'string' ? body.tipId.trim() : '';
    if (!TIP_SLUGS.includes(tipId)) {
      res.status(400).json({ error: 'Invalid tipId.' });
      return;
    }
    const store = ensureStore();
    if (!store.solvedTipIds.includes(tipId)) {
      store.solvedTipIds.push(tipId);
      writeStore(store);
    }
    res.json({ solvedTipIds: store.solvedTipIds });
  });

  // SEO endpoints
  app.get('/robots.txt', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const paths = [
      '/',
      '/openings',
      '/tactics',
      '/endgames',
      '/play',
      '/analysis',
      '/study',
      ...TIP_SLUGS.map((slug) => `/tips/${slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
      .map((p) => `  <url><loc>${origin}${p}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
