// server/src/index.ts — Express bootstrap for the StarAI Exchange backend.
//
// Wires up:
//   - CORS (configured via CORS_ORIGIN env var)
//   - JSON body parser
//   - Bootstrap MySQL schema on startup (idempotent — uses db.ts:getPool())
//   - Auth + wallet routes (see ./routes/*.ts)
//   - A simple /healthz endpoint
//   - Centralised error handler

import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { bootstrapDatabase } from './db.js';
import { authRouter } from './routes/auth.js';
import { walletRouter } from './routes/wallet.js';
import { marketRouter } from './routes/market.js';

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

const app = express();

// CORS — accept a comma-separated list of origins, or '*' for any.
const allowList = CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowList.length === 1 && allowList[0] === '*' ? true : allowList,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));

// Tiny request logger — handy in Render logs.
app.use((req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health probe.
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'starai-exchange-server', time: new Date().toISOString() });
});

// API routes.
app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/market', marketRouter);

// 404 fallback.
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// Centralised error handler.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('ERROR:', err);
  res.status(500).json({ error: 'internal_error', message: (err as Error).message });
};
app.use(errorHandler);

// Boot: ensure DB schema is present, then start listening.
(async () => {
  try {
    console.log('Bootstrapping database…');
    await bootstrapDatabase();
    console.log('Database ready.');
  } catch (e) {
    console.error('Database bootstrap failed:', (e as Error).message);
    // Don't kill the process — Render will restart us and the next
    // boot will try again. But log clearly so the issue is visible.
  }
  app.listen(PORT, () => {
    console.log(`StarAI backend listening on :${PORT} (CORS origin: ${CORS_ORIGIN})`);
  });
})();
