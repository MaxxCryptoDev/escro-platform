import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './styles/escro.css';

// Opt-in Sentry: only initialized when VITE_SENTRY_DSN is set at build/runtime.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

const ErrorBoundary = sentryDsn ? Sentry.ErrorBoundary : React.Fragment;
const errorBoundaryProps = sentryDsn
  ? { fallback: ({ resetError }) => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Ceva nu a mers bine.</h2>
        <p>Echipa a fost notificată. Reîncarcă pagina.</p>
        <button className="btn btn-primary" onClick={resetError}>Reîncearcă</button>
      </div>
    ) }
  : {};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary {...errorBoundaryProps}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
