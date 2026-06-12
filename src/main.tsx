import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';

// Defensive global handlers so an unhandled error in a side effect (a
// fetch, a timer, a window event) doesn't take the whole UI down with
// a blank black screen. They log the error so the user can still see
// it in the browser devtools.
window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('[window.onerror]', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledrejection]', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
