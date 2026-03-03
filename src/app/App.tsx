import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProjectPermissionsProvider } from './contexts/ProjectPermissionsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster as Sonner } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <ProjectPermissionsProvider>
            <NotificationProvider>
            <RouterProvider router={router} />
            <Sonner position="top-right" />
          </NotificationProvider>
          </ProjectPermissionsProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}