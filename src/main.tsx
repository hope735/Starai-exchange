import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';

// Detect the GitHub-Pages subfolder (e.g. "/Starai-exchange/") at runtime
// so the React Router `basename` works for BOTH local dev and production.
// Vite injects `import.meta.env.BASE_URL` from the `base` config in
// vite.config.ts, so we don't hard-code the repo name here.
//
// IMPORTANT: we MUST pass `undefined` (not an empty string) to BrowserRouter
// when the app is served from the domain root. react-router v6 will treat
// an empty-string basename as "/" and `stripBasename('/wallet', '')` returns
// null, which causes the router to silently render nothing — exactly the
// "blank black page" symptom users hit on Vercel.
const rawBase = import.meta.env.BASE_URL || '/';
const normalized = rawBase === '/' ? '/' : rawBase.replace(/\/+$/, '');
const basename = normalized === '/' ? undefined : normalized;

// Inline boot-error overlay: if anything below throws synchronously during
// module evaluation (bad import, syntax error after a minification issue,
// etc.) we want the user to see a visible error message instead of a
// silent black screen. The overlay also catches errors thrown during the
// React mount that escape the ErrorBoundary.
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
