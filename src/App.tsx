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
import { AdminProtectedRoute } from './components/AdminRoute';
import { PageSkeleton } from './components/Skeletons';
import { CommandOverview } from './pages/command/CommandOverview';
import { SegmentsList } from './pages/command/SegmentsList';
import { SegmentDetail } from './pages/command/SegmentDetail';
import { OutreachLogPage } from './pages/command/OutreachLogPage';
import { GovernancePanel } from './pages/command/GovernancePanel';

/** Role-aware landing: admins open Tejas Command, agents open Tejas Field. */
const RoleRedirect: React.FC = () => {
  const { profile } = useAuth();
  return <Navigate to={profile?.role === 'admin' ? '/command' : '/passport'} replace />;
};

// Protected Route Guard with onboarding redirect
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed (except when already there).
  // Admins skip field onboarding — they use Tejas Command, not the field app.
  if (
    profile &&
    !profile.onboarded &&
    profile.role !== 'admin' &&
    window.location.pathname !== '/onboarding'
  ) {
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
          <Route index element={<RoleRedirect />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="evidence" element={<EvidenceLocker />} />
          <Route path="cashflow" element={<CashFlowMap />} />
          <Route path="shock" element={<ShockSimulator />} />
          <Route path="passport" element={<Passport />} />
          <Route path="share" element={<ShareBrief />} />
          <Route path="my-shares" element={<MyShares />} />
        </Route>

        {/* ─── Tejas Command (admin only, same shell, wider content) ─── */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/command" element={<Layout />}>
            <Route index element={<CommandOverview />} />
            <Route path="segments" element={<SegmentsList />} />
            <Route path="segments/:id" element={<SegmentDetail />} />
            <Route path="outreach" element={<OutreachLogPage />} />
            <Route path="governance" element={<GovernancePanel />} />
          </Route>
        </Route>

        {/* Fallback - redirect to login if not authed, else role home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
