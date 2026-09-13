/**
 * Rule-based transaction classifier.
 * Replaces Gemini AI — uses keyword matching + regex patterns
 * to classify OCR text from UPI receipts, bank SMS, etc.
 */
import type { ClassifierResult, TransactionCategory, Direction } from '../types/database';

/* ─── Category keyword map ─── */
const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  wages: ['salary', 'wage', 'pay', 'mazdoori', 'tankhwah', 'payment received'],
  crop_sale: ['crop', 'harvest', 'mandi', 'fasal', 'agriculture', 'agri', 'kisan', 'grain', 'wheat', 'rice', 'cotton'],
  shop_sale: ['shop', 'sale', 'dukan', 'retail', 'customer', 'sold', 'bikri'],
  transport_income: ['ride', 'trip', 'auto', 'rickshaw', 'uber', 'ola', 'transport', 'fare', 'kiraya'],
  remittance: ['remittance', 'transfer', 'sent by', 'from abroad', 'western union', 'money transfer'],
  groceries: ['grocery', 'kirana', 'vegetables', 'sabzi', 'ration', 'rice', 'dal', 'oil', 'atta', 'food'],
  rent: ['rent', 'kiraya', 'house rent', 'room rent', 'lease'],
  medical: ['medical', 'hospital', 'doctor', 'medicine', 'dawai', 'clinic', 'pharmacy', 'health', 'dawa'],
  education: ['school', 'fee', 'tuition', 'education', 'books', 'exam', 'college', 'padhai', 'vidyalaya'],
  loan_repayment: ['loan', 'emi', 'repayment', 'karz', 'installment', 'credit', 'microfinance'],
  utility: ['electricity', 'bijli', 'water', 'pani', 'gas', 'recharge', 'mobile', 'phone', 'internet', 'bill'],
  other: [],
};

/* ─── Direction indicators ─── */
const INCOME_KEYWORDS = [
  'credited', 'received', 'credit', 'cr', 'incoming', 'deposit',
  'paid to you', 'money received', 'paisa aaya', 'jama',
];
const EXPENSE_KEYWORDS = [
  'debited', 'paid', 'debit', 'dr', 'sent', 'withdrawn', 'purchase',
  'payment', 'spent', 'nikala', 'bhejaa', 'kharcha',
];

/* ─── Amount extraction ─── */
const AMOUNT_PATTERNS = [
  /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|₹|inr|rupees)/i,
  /(?:amount|amt)[:\s]*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:credited|debited)[:\s]*(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

/* ─── Date extraction ─── */
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
  /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{2,4})/i,
  /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/* ─── Main classifier ─── */

export function classifyTransaction(rawText: string): ClassifierResult {
  const text = rawText.toLowerCase();
  let confidence = 0;

  // Extract amount
  let amount = 0;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      confidence += 0.3;
      break;
    }
  }

  // Determine direction
  let direction: Direction = 'in';
  const incomeScore = INCOME_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const expenseScore = EXPENSE_KEYWORDS.filter((kw) => text.includes(kw)).length;
  if (expenseScore > incomeScore) {
    direction = 'out';
    confidence += 0.2;
  } else if (incomeScore > 0) {
    direction = 'in';
    confidence += 0.2;
  }

  // Classify category
  let category: TransactionCategory = 'other';
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      category = cat as TransactionCategory;
    }
  }
  if (bestScore > 0) confidence += 0.3;

  // Extract date
  let dateStr = new Date().toISOString().split('T')[0];
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        if (match[2] && MONTH_MAP[match[2].toLowerCase().slice(0, 3)]) {
          // "12 Jan 2024" format
          const day = match[1].padStart(2, '0');
          const month = MONTH_MAP[match[2].toLowerCase().slice(0, 3)];
          const year = match[3].length === 2 ? '20' + match[3] : match[3];
          dateStr = `${year}-${month}-${day}`;
        } else if (match[0].match(/^\d{4}/)) {
          // "2024-01-12" ISO format
          dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          // "12/01/2024" DD/MM/YYYY format
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3].length === 2 ? '20' + match[3] : match[3];
          dateStr = `${year}-${month}-${day}`;
        }
        confidence += 0.2;
        break;
      } catch {
        // Keep default date
      }
    }
  }

  // Determine provenance label
  const provenanceLabel = confidence >= 0.5 ? 'verified' : 'estimated';

  return {
    date: dateStr,
    amount: amount || 0,
    direction,
    category,
    confidence: Math.min(confidence, 1),
    provenance_label: provenanceLabel,
  };
}
