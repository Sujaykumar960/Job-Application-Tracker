import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <span className="text-6xl font-extrabold text-[#0A66C2] font-mono">404</span>
      <h2 className="text-xl font-bold text-[#1D2226]">Page Not Found</h2>
      <p className="text-xs text-[#56687A] max-w-sm">
        The requested career view or resource could not be found.
      </p>
      <Link to="/">
        <Button size="sm" variant="primary" icon={<Home className="w-4 h-4" />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
