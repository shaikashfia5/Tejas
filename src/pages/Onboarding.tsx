import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Wheat,
  Briefcase,
  Layers,
  Clock,
  Sprout,
  Coins,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import type { IncomeType, GoalType } from '../types/database';

export const Onboarding: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>(locale);
  const [selectedIncomeType, setSelectedIncomeType] = useState<IncomeType>(
    profile?.income_type || 'seasonal'
  );
  const [selectedGoal, setSelectedGoal] = useState<GoalType>(
    profile?.goal || 'crop_input'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setSelectedLanguage(lang);
    setLocale(lang);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    await updateProfile({
      language: selectedLanguage,
      income_type: selectedIncomeType,
      goal: selectedGoal,
      onboarded: true,
    });
    setSubmitting(false);
    navigate('/evidence');
  };

  const incomeOptions: { id: IncomeType; label: string; desc: string; icon: any }[] = [
    {
      id: 'seasonal',
      label: t('onboarding.income.seasonal'),
      desc: t('onboarding.income.seasonal.desc'),
      icon: Wheat,
    },
    {
      id: 'project',
      label: t('onboarding.income.project'),
      desc: t('onboarding.income.project.desc'),
      icon: Briefcase,
    },
    {
      id: 'mixed',
      label: t('onboarding.income.mixed'),
      desc: t('onboarding.income.mixed.desc'),
      icon: Layers,
    },
    {
      id: 'regular-informal',
      label: t('onboarding.income.regular-informal'),
      desc: t('onboarding.income.regular-informal.desc'),
      icon: Clock,
    },
  ];

  const goalOptions: { id: GoalType; label: string; desc: string; icon: any }[] = [
    {
      id: 'crop_input',
      label: t('onboarding.goal.crop_input'),
      desc: t('onboarding.goal.crop_input.desc'),
      icon: Sprout,
    },
    {
      id: 'working_capital',
      label: t('onboarding.goal.working_capital'),
      desc: t('onboarding.goal.working_capital.desc'),
      icon: Coins,
    },
    {
      id: 'emergency_buffer',
      label: t('onboarding.goal.emergency_buffer'),
      desc: t('onboarding.goal.emergency_buffer.desc'),
      icon: ShieldCheck,
    },
    {
      id: 'education_fee',
      label: t('onboarding.goal.education_fee'),
      desc: t('onboarding.goal.education_fee.desc'),
      icon: GraduationCap,
    },
    {
      id: 'other',
      label: t('onboarding.goal.other'),
      desc: t('onboarding.goal.other.desc'),
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col justify-between py-6 px-4">
      {/* Progress Dots & Step Title */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-amber-500'
                  : s < step
                  ? 'w-4 bg-emerald-500'
                  : 'w-4 bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white">
            {step === 1 && t('onboarding.step1')}
            {step === 2 && t('onboarding.step2')}
            {step === 3 && t('onboarding.step3')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('onboarding.subtitle')} ({step}/3)
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="my-6">
        {/* Step 1: Language */}
        {step === 1 && (
          <div className="space-y-4 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between text-left ${
                selectedLanguage === 'en'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10 scale-[1.02]'
                  : 'bg-slate-800/80 border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🇬🇧</span>
                <div>
                  <h3 className="font-bold text-lg">English</h3>
                  <p className="text-xs text-slate-400">Standard English Interface</p>
                </div>
              </div>
              {selectedLanguage === 'en' && (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-navy-950 flex items-center justify-center">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('hi')}
              className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between text-left ${
                selectedLanguage === 'hi'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10 scale-[1.02]'
                  : 'bg-slate-800/80 border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🇮🇳</span>
                <div>
                  <h3 className="font-bold text-lg">हिंदी (Hindi)</h3>
                  <p className="text-xs text-slate-400">सरल हिंदी भाषा इंटरफ़ेस</p>
                </div>
              </div>
              {selectedLanguage === 'hi' && (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-navy-950 flex items-center justify-center">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Income Rhythm / Type */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            {incomeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedIncomeType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedIncomeType(opt.id)}
                  className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/70 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-navy-950'
                        : 'bg-slate-700/80 text-amber-400'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight text-white mb-1">
                      {opt.label}
                    </h4>
                    <p className="text-xs text-slate-400 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Entrepreneur Goal */}
        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            {goalOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedGoal === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedGoal(opt.id)}
                  className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/70 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-navy-950'
                        : 'bg-slate-700/80 text-amber-400'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight text-white mb-1">
                      {opt.label}
                    </h4>
                    <p className="text-xs text-slate-400 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto w-full pt-4 border-t border-white/10">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="btn-secondary"
          >
            <ArrowLeft size={16} />
            <span>{t('onboarding.back')}</span>
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as any)}
            className="btn-primary"
          >
            <span>{t('onboarding.next')}</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleFinish}
            className="btn-primary"
          >
            {submitting ? (
              <div className="spinner" />
            ) : (
              <>
                <span>{t('onboarding.finish')}</span>
                <Check size={16} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
