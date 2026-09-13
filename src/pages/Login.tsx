import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import { LanguageSelector } from '../components/LanguageSelector';

export const Login: React.FC = () => {
  const { login, signUp, loginAsDemo } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (isSignUp && !fullName.trim()) { setError('Full name is required.'); return; }
    setLoading(true);

    if (isSignUp) {
      const res = await signUp(email.trim(), password, fullName.trim());
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      navigate('/onboarding');
    } else {
      const res = await login(email.trim(), password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      navigate('/passport');
    }
  };

  const handleQuickDemo = (persona: 'lakshmi' | 'raju' | 'priya') => {
    loginAsDemo(persona);
    navigate('/passport');
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col justify-center px-4 py-8">
      {/* Top Language Toggle */}
      <div className="max-w-md w-full mx-auto flex justify-end mb-4">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 shadow-xl shadow-amber-500/20 text-navy-950 font-black text-2xl mb-1 animate-pulse-soft">
            ⚡
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
            {t('app.name')}
          </h1>
          <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">
            {t('app.tagline')}
          </p>
        </div>

        {/* 1-Click Demo Profiles (Ideal for Instant Testing & Evaluation) */}
        <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Instant 1-Click Demo Accounts</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Choose a realistic synthetic profile with pre-seeded evidence & obligations:
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickDemo('lakshmi')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🌾</span>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Lakshmi Devi
                  </h4>
                  <p className="text-[11px] text-slate-400">Seasonal Farmer • Cotton & Groundnut</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('raju')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🛺</span>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Raju Kumar
                  </h4>
                  <p className="text-[11px] text-slate-400">Auto Driver • Regular Informal Income</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('priya')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🧵</span>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Priya Sharma
                  </h4>
                  <p className="text-[11px] text-slate-400">Tailoring Enterprise • Mixed Orders</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        {/* Email / Password Form */}
        <div className="glass-card p-6 border-white/10 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck size={18} className="text-amber-400" />
            <span>{isSignUp ? t('auth.signup') : t('auth.login')}</span>
          </h2>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('auth.name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <span>{isSignUp ? t('auth.signup') : t('auth.login')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium"
            >
              {isSignUp ? t('auth.has_account') : t('auth.no_account')}{' '}
              <span className="underline font-bold">
                {isSignUp ? t('auth.login') : t('auth.signup')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
