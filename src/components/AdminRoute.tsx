import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/** Renders children only for admins; field agents get a clear explanation. */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="page-container flex flex-col items-center justify-center text-center space-y-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <ShieldAlert size={28} className="text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Tejas Command</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          This is the program administrator dashboard. Field agents use Tejas
          Field — ask your program office for an admin account if you need
          access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

/** Route wrapper that also applies the protected-session check. */
export const AdminProtectedRoute: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (profile && profile.role !== 'admin') {
    return (
      <div className="page-container flex flex-col items-center justify-center text-center space-y-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <ShieldAlert size={28} className="text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Tejas Command</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          Admin access required. Your account is a field agent — open Tejas
          Field to continue your activation work.
        </p>
      </div>
    );
  }
  return <Outlet />;
};
