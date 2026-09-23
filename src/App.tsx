import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { EvidenceLocker } from './pages/EvidenceLocker';
import { CashFlowMap } from './pages/CashFlowMap';
import { ShockSimulator } from './pages/ShockSimulator';
import { Passport } from './pages/Passport';
import { ShareBrief } from './pages/ShareBrief';
import { MyShares } from './pages/MyShares';
import { PublicBrief } from './pages/PublicBrief';

// Protected Route Guard with onboarding redirect
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed (except when already there)
  if (profile && !profile.onboarded && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Read-Only Brief */}
        <Route path="/brief/:token" element={<PublicBrief />} />

        {/* Public Auth */}
        <Route path="/login" element={<Login />} />

        {/* Protected App Routes wrapped in App Shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/passport" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="evidence" element={<EvidenceLocker />} />
          <Route path="cashflow" element={<CashFlowMap />} />
          <Route path="shock" element={<ShockSimulator />} />
          <Route path="passport" element={<Passport />} />
          <Route path="share" element={<ShareBrief />} />
          <Route path="my-shares" element={<MyShares />} />
        </Route>

        {/* Fallback - redirect to login if not authed, else passport */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
