import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export const LanguageSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center rounded-xl bg-slate-800/80 p-1 border border-white/10 backdrop-blur-md">
      {!compact && <Globe size={14} className="text-amber-400 ml-2 mr-1" />}
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
          locale === 'en'
            ? 'bg-amber-500 text-navy-900 shadow-sm'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('hi')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
          locale === 'hi'
            ? 'bg-amber-500 text-navy-900 shadow-sm'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        हिंदी
      </button>
    </div>
  );
};
