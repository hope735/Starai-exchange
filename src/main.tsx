import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';

// Detect the host path the SPA is served from so the React Router
// `basename` is correct on BOTH local dev and production.
//
//   vite.config.ts has `base: './'` so that the same build can be served
//   from `/`, `/Starai-exchange/`, or any other subfolder. That makes
//   `import.meta.env.BASE_URL` resolve to "./" on root hosts (Vercel,
//   Netlify) and to "/Starai-exchange/" on GitHub Pages.
//
// We must pass `undefined` (NOT "." or "") to BrowserRouter on root hosts.
// In react-router v6, a non-undefined basename causes
// `stripBasename('/wallet', '.')` to return `null` → the router silently
// renders nothing → fully blank black page. This was the bug that
// shipped before; the logic below handles both root hosts AND subfolder
// hosts correctly.
function resolveBasename(): string | undefined {
  const raw = import.meta.env.BASE_URL || '/';
  // Normalise: strip trailing slashes, drop a leading "." that Vite emits
  // for relative base paths, and ignore an empty result.
  let cleaned = raw.replace(/\/+$/, '');
  if (cleaned === '' || cleaned === '.' || cleaned === './') {
    return undefined;
  }
  // For a subfolder host like "/Starai-exchange", react-router wants the
  // basename to start with a slash but not end with one.
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }
  return cleaned;
}
const basename = resolveBasename();

// Inline boot-error overlay: if anything throws synchronously during module
// evaluation (bad import, syntax error after a minification issue, etc.)
// we want the user to see a visible error message instead of a silent
// black screen. The overlay also catches errors thrown during the React
// mount that escape the ErrorBoundary.
function showBootError(message: string, stack?: string) {
  const root = document.getElementById('root');
  if (!root) return;
  const pre = document.createElement('pre');
  pre.style.cssText =
    'position:fixed;inset:0;margin:0;padding:24px;color:#f6465d;' +
    'background:#0b0e11;font:13px/1.5 ui-monospace,monospace;' +
    'white-space:pre-wrap;overflow:auto;z-index:99999;';
  pre.textContent =
    'StarAI Exchange failed to boot.\n\n' +
    message +
    (stack ? '\n\n' + stack : '');
  // Replace any existing children so the user always sees the error.
  root.replaceChildren(pre);
}

window.addEventListener('error', (event) => {
  showBootError(
    event.error?.message ?? event.message ?? 'Unknown error',
    event.error?.stack,
  );
});
window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason;
  showBootError(
    reason instanceof Error ? reason.message : String(reason ?? 'Unknown rejection'),
    reason instanceof Error ? reason.stack : undefined,
  );
});

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename={basename}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (e) {
  const err = e instanceof Error ? e : new Error(String(e));
  // eslint-disable-next-line no-console
  console.error('[boot]', err);
  showBootError(err.message, err.stack);
}
