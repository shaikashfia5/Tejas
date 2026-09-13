import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/* ─── Locale Strings ─── */

const locales: Record<string, Record<string, string>> = {
  en: {
    // App
    'app.name': 'Tejas',
    'app.tagline': 'Your Financial Continuity Passport',
    'app.offline': 'You are offline. Entries will sync when connected.',

    // Nav
    'nav.evidence': 'Evidence',
    'nav.cashflow': 'Cash Flow',
    'nav.shock': 'Shock Sim',
    'nav.passport': 'Passport',
    'nav.share': 'Share',

    // Auth
    'auth.login': 'Sign In',
    'auth.signup': 'Create Account',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.name': 'Full name',
    'auth.demo': 'Demo accounts available',
    'auth.demo.hint': 'Use demo1@tejas.app / demo123',
    'auth.logout': 'Sign Out',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',

    // Onboarding
    'onboarding.welcome': 'Welcome to Tejas',
    'onboarding.subtitle': 'Let\'s set up your financial passport in 3 simple steps',
    'onboarding.step1': 'Choose Language',
    'onboarding.step2': 'Income Type',
    'onboarding.step3': 'Your Goal',
    'onboarding.language.en': 'English',
    'onboarding.language.hi': 'हिंदी',
    'onboarding.income.seasonal': 'Seasonal',
    'onboarding.income.seasonal.desc': 'Income tied to seasons (farming, fishing)',
    'onboarding.income.project': 'Project-based',
    'onboarding.income.project.desc': 'Income from individual jobs or contracts',
    'onboarding.income.mixed': 'Mixed',
    'onboarding.income.mixed.desc': 'Multiple income sources, varying amounts',
    'onboarding.income.regular-informal': 'Regular Informal',
    'onboarding.income.regular-informal.desc': 'Steady income without formal payslips',
    'onboarding.goal.crop_input': 'Crop Inputs',
    'onboarding.goal.crop_input.desc': 'Seeds, fertilizer, equipment',
    'onboarding.goal.working_capital': 'Working Capital',
    'onboarding.goal.working_capital.desc': 'Day-to-day business expenses',
    'onboarding.goal.emergency_buffer': 'Emergency Buffer',
    'onboarding.goal.emergency_buffer.desc': 'Safety net for unexpected costs',
    'onboarding.goal.education_fee': 'Education Fees',
    'onboarding.goal.education_fee.desc': 'School or training costs',
    'onboarding.goal.other': 'Other Goal',
    'onboarding.goal.other.desc': 'Something else entirely',
    'onboarding.next': 'Next',
    'onboarding.back': 'Back',
    'onboarding.finish': 'Start Building My Passport',

    // Evidence Locker
    'evidence.title': 'Evidence Locker',
    'evidence.subtitle': 'Build your financial story with proof',
    'evidence.upload': 'Scan Document',
    'evidence.manual': 'Manual Entry',
    'evidence.upload.hint': 'Upload a photo of a UPI receipt, bank SMS, or any transaction proof',
    'evidence.processing': 'Processing...',
    'evidence.ocr': 'Reading text from image...',
    'evidence.classifying': 'Classifying transaction...',
    'evidence.confirm': 'Confirm Entry',
    'evidence.edit': 'Edit',
    'evidence.save': 'Save Entry',
    'evidence.cancel': 'Cancel',
    'evidence.date': 'Date',
    'evidence.amount': 'Amount (₹)',
    'evidence.direction': 'Direction',
    'evidence.direction.in': 'Money In',
    'evidence.direction.out': 'Money Out',
    'evidence.category': 'Category',
    'evidence.empty': 'No evidence yet. Start by uploading a document or adding a manual entry.',
    'evidence.queued': 'Saved offline — will sync when connected',
    'evidence.count': 'entries',

    // Categories
    'category.wages': 'Wages',
    'category.crop_sale': 'Crop Sale',
    'category.shop_sale': 'Shop Sale',
    'category.transport_income': 'Transport Income',
    'category.remittance': 'Remittance',
    'category.groceries': 'Groceries',
    'category.rent': 'Rent',
    'category.medical': 'Medical',
    'category.education': 'Education',
    'category.loan_repayment': 'Loan Repayment',
    'category.utility': 'Utility Bill',
    'category.other': 'Other',

    // Provenance
    'provenance.verified': 'Verified',
    'provenance.declared': 'Declared',
    'provenance.estimated': 'Estimated',

    // Cash Flow
    'cashflow.title': 'Cash Flow Map',
    'cashflow.subtitle': 'Your money movement at a glance',
    'cashflow.income_rhythm': 'Income Rhythm',
    'cashflow.inflows': 'Inflows',
    'cashflow.outflows': 'Outflows',
    'cashflow.buffer': 'Buffer Days',
    'cashflow.last30': 'Last 30 Days',
    'cashflow.last90': 'Last 90 Days',
    'cashflow.obligations': 'Upcoming Obligations',
    'cashflow.no_obligations': 'No upcoming obligations',
    'cashflow.add_obligation': 'Add Obligation',
    'cashflow.obligation.desc': 'Description',
    'cashflow.obligation.amount': 'Amount (₹)',
    'cashflow.obligation.due': 'Due Date',

    // Shock Simulator
    'shock.title': 'Shock Simulator',
    'shock.subtitle': 'Test your resilience against unexpected events',
    'shock.type': 'Scenario Type',
    'shock.type.delayed_payment': 'Delayed Payment',
    'shock.type.medical_expense': 'Medical Expense',
    'shock.type.fee_deadline': 'Fee Deadline',
    'shock.type.supplier_payment': 'Supplier Payment',
    'shock.amount': 'Shock Amount (₹)',
    'shock.date': 'When would this happen?',
    'shock.simulate': 'Run Simulation',
    'shock.result.before': 'Buffer Before',
    'shock.result.after': 'Buffer After',
    'shock.result.shortfall': 'Shortfall Date',
    'shock.result.gap': 'Gap Amount',
    'shock.result.days': 'days',
    'shock.result.none': 'No shortfall — you can absorb this shock!',
    'shock.history': 'Past Simulations',

    // Passport
    'passport.title': 'Financial Passport',
    'passport.subtitle': 'Your complete financial continuity profile',
    'passport.income_pattern': 'Income Pattern',
    'passport.obligation_map': 'Obligation Map',
    'passport.resilience': 'Resilience Buffer',
    'passport.proof_strength': 'Proof Strength',
    'passport.goal_readiness': 'Goal Readiness',
    'passport.regular': 'Regular',
    'passport.seasonal': 'Seasonal',
    'passport.irregular': 'Irregular',
    'passport.obligations_count': 'obligations',
    'passport.upcoming': 'upcoming',
    'passport.days': 'days',
    'passport.toward_goal': 'toward goal',
    'passport.source_evidence': 'Source Evidence',

    // Share
    'share.title': 'Share Brief',
    'share.subtitle': 'Create a time-limited snapshot for lenders or partners',
    'share.generate': 'Generate Brief',
    'share.generating': 'Generating...',
    'share.expiry': 'Expires in',
    'share.expiry.days': 'days',
    'share.copy': 'Copy Link',
    'share.copied': 'Copied!',
    'share.download_pdf': 'Download PDF',
    'share.manage': 'Manage Shares',
    'share.my_shares': 'My Shared Briefs',
    'share.active': 'Active',
    'share.expired': 'Expired',
    'share.revoked': 'Revoked',
    'share.revoke': 'Revoke',
    'share.no_shares': 'No shared briefs yet',

    // Public Brief
    'brief.title': 'Financial Continuity Brief',
    'brief.generated': 'Generated on',
    'brief.expires': 'Valid until',
    'brief.unavailable': 'This brief is no longer available',
    'brief.revoked_or_expired': 'It may have been revoked or has expired.',

    // General
    'general.loading': 'Loading...',
    'general.error': 'Something went wrong',
    'general.retry': 'Try Again',
    'general.save': 'Save',
    'general.delete': 'Delete',
    'general.close': 'Close',
    'general.currency': '₹',
  },

  hi: {
    // App
    'app.name': 'तेजस',
    'app.tagline': 'आपका वित्तीय निरंतरता पासपोर्ट',
    'app.offline': 'आप ऑफलाइन हैं। कनेक्ट होने पर एंट्री सिंक होंगी।',

    // Nav
    'nav.evidence': 'साक्ष्य',
    'nav.cashflow': 'कैश फ्लो',
    'nav.shock': 'शॉक सिम',
    'nav.passport': 'पासपोर्ट',
    'nav.share': 'शेयर',

    // Auth
    'auth.login': 'साइन इन',
    'auth.signup': 'खाता बनाएं',
    'auth.email': 'ईमेल पता',
    'auth.password': 'पासवर्ड',
    'auth.name': 'पूरा नाम',
    'auth.demo': 'डेमो खाते उपलब्ध हैं',
    'auth.demo.hint': 'demo1@tejas.app / demo123 का उपयोग करें',
    'auth.logout': 'साइन आउट',
    'auth.no_account': 'खाता नहीं है?',
    'auth.has_account': 'पहले से खाता है?',

    // Onboarding
    'onboarding.welcome': 'तेजस में आपका स्वागत है',
    'onboarding.subtitle': '3 सरल चरणों में अपना वित्तीय पासपोर्ट बनाएं',
    'onboarding.step1': 'भाषा चुनें',
    'onboarding.step2': 'आय का प्रकार',
    'onboarding.step3': 'आपका लक्ष्य',
    'onboarding.language.en': 'English',
    'onboarding.language.hi': 'हिंदी',
    'onboarding.income.seasonal': 'मौसमी',
    'onboarding.income.seasonal.desc': 'मौसम से जुड़ी आय (खेती, मछली पालन)',
    'onboarding.income.project': 'प्रोजेक्ट-आधारित',
    'onboarding.income.project.desc': 'व्यक्तिगत कार्यों या ठेकों से आय',
    'onboarding.income.mixed': 'मिश्रित',
    'onboarding.income.mixed.desc': 'कई आय स्रोत, अलग-अलग राशि',
    'onboarding.income.regular-informal': 'नियमित अनौपचारिक',
    'onboarding.income.regular-informal.desc': 'बिना औपचारिक पर्ची के स्थिर आय',
    'onboarding.goal.crop_input': 'फसल सामग्री',
    'onboarding.goal.crop_input.desc': 'बीज, उर्वरक, उपकरण',
    'onboarding.goal.working_capital': 'कार्यशील पूंजी',
    'onboarding.goal.working_capital.desc': 'दैनिक व्यापार खर्च',
    'onboarding.goal.emergency_buffer': 'आपातकालीन बफर',
    'onboarding.goal.emergency_buffer.desc': 'अप्रत्याशित खर्चों के लिए सुरक्षा',
    'onboarding.goal.education_fee': 'शिक्षा शुल्क',
    'onboarding.goal.education_fee.desc': 'स्कूल या प्रशिक्षण की लागत',
    'onboarding.goal.other': 'अन्य लक्ष्य',
    'onboarding.goal.other.desc': 'कुछ और',
    'onboarding.next': 'आगे',
    'onboarding.back': 'पीछे',
    'onboarding.finish': 'मेरा पासपोर्ट बनाना शुरू करें',

    // Evidence Locker
    'evidence.title': 'साक्ष्य लॉकर',
    'evidence.subtitle': 'प्रमाण के साथ अपनी वित्तीय कहानी बनाएं',
    'evidence.upload': 'दस्तावेज़ स्कैन करें',
    'evidence.manual': 'मैनुअल एंट्री',
    'evidence.upload.hint': 'UPI रसीद, बैंक SMS, या किसी लेनदेन प्रमाण की फोटो अपलोड करें',
    'evidence.processing': 'प्रोसेसिंग...',
    'evidence.ocr': 'छवि से पाठ पढ़ रहे हैं...',
    'evidence.classifying': 'लेनदेन वर्गीकृत कर रहे हैं...',
    'evidence.confirm': 'एंट्री की पुष्टि करें',
    'evidence.edit': 'संपादित करें',
    'evidence.save': 'एंट्री सहेजें',
    'evidence.cancel': 'रद्द करें',
    'evidence.date': 'तारीख',
    'evidence.amount': 'राशि (₹)',
    'evidence.direction': 'दिशा',
    'evidence.direction.in': 'पैसे आए',
    'evidence.direction.out': 'पैसे गए',
    'evidence.category': 'श्रेणी',
    'evidence.empty': 'अभी कोई साक्ष्य नहीं। दस्तावेज़ अपलोड करके या मैनुअल एंट्री जोड़कर शुरू करें।',
    'evidence.queued': 'ऑफलाइन सहेजा गया — कनेक्ट होने पर सिंक होगा',
    'evidence.count': 'एंट्री',

    // Categories
    'category.wages': 'मजदूरी',
    'category.crop_sale': 'फसल बिक्री',
    'category.shop_sale': 'दुकान बिक्री',
    'category.transport_income': 'परिवहन आय',
    'category.remittance': 'रेमिटेंस',
    'category.groceries': 'किराना',
    'category.rent': 'किराया',
    'category.medical': 'चिकित्सा',
    'category.education': 'शिक्षा',
    'category.loan_repayment': 'ऋण चुकौती',
    'category.utility': 'बिजली-पानी बिल',
    'category.other': 'अन्य',

    // Provenance
    'provenance.verified': 'सत्यापित',
    'provenance.declared': 'घोषित',
    'provenance.estimated': 'अनुमानित',

    // Cash Flow
    'cashflow.title': 'कैश फ्लो मैप',
    'cashflow.subtitle': 'एक नज़र में आपके पैसे की गतिविधि',
    'cashflow.income_rhythm': 'आय का लय',
    'cashflow.inflows': 'आवक',
    'cashflow.outflows': 'जावक',
    'cashflow.buffer': 'बफर दिन',
    'cashflow.last30': 'पिछले 30 दिन',
    'cashflow.last90': 'पिछले 90 दिन',
    'cashflow.obligations': 'आगामी दायित्व',
    'cashflow.no_obligations': 'कोई आगामी दायित्व नहीं',
    'cashflow.add_obligation': 'दायित्व जोड़ें',
    'cashflow.obligation.desc': 'विवरण',
    'cashflow.obligation.amount': 'राशि (₹)',
    'cashflow.obligation.due': 'देय तिथि',

    // Shock Simulator
    'shock.title': 'शॉक सिम्युलेटर',
    'shock.subtitle': 'अप्रत्याशित घटनाओं के खिलाफ अपनी सहनशक्ति का परीक्षण करें',
    'shock.type': 'परिदृश्य प्रकार',
    'shock.type.delayed_payment': 'भुगतान में देरी',
    'shock.type.medical_expense': 'चिकित्सा खर्च',
    'shock.type.fee_deadline': 'शुल्क की समय सीमा',
    'shock.type.supplier_payment': 'आपूर्तिकर्ता भुगतान',
    'shock.amount': 'शॉक राशि (₹)',
    'shock.date': 'यह कब होगा?',
    'shock.simulate': 'सिमुलेशन चलाएं',
    'shock.result.before': 'पहले का बफर',
    'shock.result.after': 'बाद का बफर',
    'shock.result.shortfall': 'कमी की तारीख',
    'shock.result.gap': 'अंतर राशि',
    'shock.result.days': 'दिन',
    'shock.result.none': 'कोई कमी नहीं — आप इस शॉक को सह सकते हैं!',
    'shock.history': 'पिछले सिमुलेशन',

    // Passport
    'passport.title': 'वित्तीय पासपोर्ट',
    'passport.subtitle': 'आपकी पूरी वित्तीय निरंतरता प्रोफाइल',
    'passport.income_pattern': 'आय पैटर्न',
    'passport.obligation_map': 'दायित्व मैप',
    'passport.resilience': 'सहनशक्ति बफर',
    'passport.proof_strength': 'प्रमाण शक्ति',
    'passport.goal_readiness': 'लक्ष्य तैयारी',
    'passport.regular': 'नियमित',
    'passport.seasonal': 'मौसमी',
    'passport.irregular': 'अनियमित',
    'passport.obligations_count': 'दायित्व',
    'passport.upcoming': 'आगामी',
    'passport.days': 'दिन',
    'passport.toward_goal': 'लक्ष्य की ओर',
    'passport.source_evidence': 'स्रोत साक्ष्य',

    // Share
    'share.title': 'ब्रीफ शेयर करें',
    'share.subtitle': 'ऋणदाताओं या भागीदारों के लिए समय-सीमित स्नैपशॉट बनाएं',
    'share.generate': 'ब्रीफ बनाएं',
    'share.generating': 'बना रहे हैं...',
    'share.expiry': 'समाप्ति',
    'share.expiry.days': 'दिन',
    'share.copy': 'लिंक कॉपी करें',
    'share.copied': 'कॉपी हो गया!',
    'share.download_pdf': 'PDF डाउनलोड करें',
    'share.manage': 'शेयर प्रबंधित करें',
    'share.my_shares': 'मेरे शेयर किए गए ब्रीफ',
    'share.active': 'सक्रिय',
    'share.expired': 'समाप्त',
    'share.revoked': 'रद्द',
    'share.revoke': 'रद्द करें',
    'share.no_shares': 'अभी कोई शेयर किया गया ब्रीफ नहीं',

    // Public Brief
    'brief.title': 'वित्तीय निरंतरता ब्रीफ',
    'brief.generated': 'बनाया गया',
    'brief.expires': 'मान्य तक',
    'brief.unavailable': 'यह ब्रीफ अब उपलब्ध नहीं है',
    'brief.revoked_or_expired': 'इसे रद्द किया गया हो सकता है या इसकी अवधि समाप्त हो गई है।',

    // General
    'general.loading': 'लोड हो रहा है...',
    'general.error': 'कुछ गलत हो गया',
    'general.retry': 'पुनः प्रयास करें',
    'general.save': 'सहेजें',
    'general.delete': 'हटाएं',
    'general.close': 'बंद करें',
    'general.currency': '₹',
  },
};

/* ─── Context ─── */

type Locale = 'en' | 'hi';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('tejas-locale');
    return (saved === 'hi' ? 'hi' : 'en') as Locale;
  });

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('tejas-locale', newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return locales[locale]?.[key] ?? locales['en']?.[key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export default I18nContext;
