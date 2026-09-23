/**
 * Evidence structuring pipeline.
 *
 * Primary:  Supabase Edge Function `parse-evidence` — the Gemini API key stays
 *           server-side and every call is authenticated + rate limited.
 * Fallback: local rule-based classifier (works fully offline).
 *
 * NOTE: the previous direct-from-browser Gemini call was removed on purpose.
 * Any VITE_* variable is embedded in the shipped JS bundle, so a client-side
 * API key is publicly readable and trivially abusable.
 */
import { classifyTransaction } from './classifier';
import { isSupabaseConfigured, supabase } from './supabase';
import type { ClassifierResult } from '../types/database';

export async function parseWithGemini(rawText: string): Promise<ClassifierResult | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-evidence', {
        body: { raw_text: rawText.slice(0, 2000) },
      });
      if (!error && data && typeof (data as { amount?: unknown }).amount === 'number') {
        return normalizeGeminiResult(data as Record<string, unknown>);
      }
    } catch {
      // Edge function unreachable — fall through to the local classifier.
    }
  }
  return classifyTransaction(rawText);
}

function normalizeGeminiResult(data: Record<string, unknown>): ClassifierResult {
  const cats = ['wages','crop_sale','shop_sale','transport_income','remittance','groceries','rent','medical','education','loan_repayment','utility','other'];
  const cat = cats.includes(String(data.category)) ? String(data.category) as ClassifierResult['category'] : 'other';
  const dir = data.direction === 'out' ? 'out' as const : 'in' as const;
  const amount = Number(data.amount) || 0;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(data.date)) ? String(data.date) : new Date().toISOString().split('T')[0];
  const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.7));
  return {
    amount,
    direction: dir,
    category: cat,
    date,
    confidence,
    provenance_label: confidence >= 0.7 ? 'verified' : confidence >= 0.45 ? 'declared' : 'estimated',
  };
}
