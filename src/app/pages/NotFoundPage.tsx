import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')} className="bg-[#7A1516] hover:bg-[#5A1012]">
          <Home className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
