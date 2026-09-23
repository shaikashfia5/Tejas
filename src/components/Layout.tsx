import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FolderLock,
  TrendingUp,
  Zap,
  Award,
  Share2,
  LogOut,
  WifiOff,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import { LanguageSelector } from './LanguageSelector';

export const Layout: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/evidence', label: t('nav.evidence'), icon: FolderLock },
    { to: '/cashflow', label: t('nav.cashflow'), icon: TrendingUp },
    { to: '/shock', label: t('nav.shock'), icon: Zap },
    { to: '/passport', label: t('nav.passport'), icon: Award },
    { to: '/share', label: t('nav.share'), icon: Share2 },
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col selection:bg-amber-500 selection:text-navy-900">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="offline-banner flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>{t('app.offline')}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-navy-950/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {/* Logo & Tag */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-navy-950 shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                  Tejas
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Passport
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <LanguageSelector />

            {user && (
              <div className="flex items-center gap-1.5">
                <div
                  className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 flex items-center gap-1.5"
                  title={user.email || profile?.full_name || 'User'}
                >
                  <User size={16} className="text-amber-400" />
                  <span className="text-xs font-medium max-w-[70px] truncate hidden sm:inline">
                    {profile?.full_name?.split(' ')[0] || 'User'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
                  title={t('auth.logout')}
                  aria-label={t('auth.logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar (Mobile-first app shell) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-amber-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-amber-500/15 text-amber-400' : ''
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
