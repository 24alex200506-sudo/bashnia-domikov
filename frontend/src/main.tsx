import { createRoot } from 'react-dom/client';
import Menu from './Menu';
import { ErrorBoundary } from '@/components/error-boundary';
import './index.css';

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <Menu />
  </ErrorBoundary>,
);
