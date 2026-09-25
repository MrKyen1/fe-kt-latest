import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { preMessage } from '@rc-component/util/es/warning';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './App.css';

// 1. Ant Design official warning pipeline filter: return null to suppress benign warnings completely
preMessage((message: string) => {
  if (
    typeof message === 'string' &&
    (message.includes('[antd:') ||
      message.includes('Static function can not consume context') ||
      message.includes('There exists deprecated usage'))
  ) {
    return null;
  }
  return message;
});

// 2. Global console filter to catch any direct or formatted console warnings/errors
const isAntdWarning = (...args: any[]) => {
  return args.some(arg => {
    if (typeof arg === 'string') {
      return (
        arg.includes('[antd:') ||
        arg.includes('Static function can not consume context') ||
        arg.includes('There exists deprecated usage') ||
        arg.startsWith('Warning: [antd')
      );
    }
    return false;
  });
};

const origWarn = console.warn;
const origError = console.error;

console.warn = (...args: any[]) => {
  if (isAntdWarning(...args)) return;
  origWarn(...args);
};

console.error = (...args: any[]) => {
  if (isAntdWarning(...args)) return;
  origError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
