import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleType } from '../types';
import { Sparkles } from 'lucide-react';

export interface ProtectedRouteProps {
  allowedRoles?: RoleType[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectTo = '/dashboard',
  children,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-xs font-mono text-slate-400">Verifying CareerX session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve intended destination path in location.state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce role-based access control
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
