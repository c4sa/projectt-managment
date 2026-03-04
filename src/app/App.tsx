import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsMatrixProvider } from './contexts/PermissionsMatrixContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster as Sonner } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PermissionsMatrixProvider>
          <LanguageProvider>
            <NotificationProvider>
              <RouterProvider router={router} />
              <Sonner position="top-right" />
            </NotificationProvider>
          </LanguageProvider>
        </PermissionsMatrixProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}