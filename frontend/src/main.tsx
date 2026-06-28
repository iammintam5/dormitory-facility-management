import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/auth-context';
import { router } from './router';
import { ToastProvider } from './toast/toast-context';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SessionExpiredDialog } from './components/ui/SessionExpiredDialog';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <SessionExpiredDialog />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
