/**
 * Gemini structured parsing: Tesseract raw_text -> transaction JSON
 * Primary: Supabase Edge Function `parse-evidence` (keeps API key secret).
 * Fallback: direct Gemini API call if VITE_GEMINI_API_KEY present (demo/dev).
 * Fallback2: local classifier if offline or no key.
 */
import { classifyTransaction } from './classifier';
import { isSupabaseConfigured, supabase } from './supabase';
import type { ClassifierResult } from '../types/database';

const GEMINI_MODEL = 'gemini-1.5-flash';

function buildPrompt(rawText: string): string {
  return `You are a financial receipt parser for rural Indian micro-entrepreneurs.
Extract a single transaction from this OCR text. Return ONLY valid JSON with keys:
{"amount": number, "direction": "in"|"out", "category": one of [wages,crop_sale,shop_sale,transport_income,remittance,groceries,rent,medical,education,loan_repayment,utility,other], "date": "YYYY-MM-DD", "confidence": 0.0-1.0}

Rules:
- amount: numeric INR amount, ignore commas
- direction: in if credited/received/deposit/incoming, out if debited/paid/sent/purchase
- category: best match from list
- date: ISO date found in text, else today ${new Date().toISOString().split('T')[0]}
- confidence: 0-1 based on clarity

OCR Text:
"""${rawText.slice(0, 2000)}"""`;
}

export async function parseWithGemini(rawText: string): Promise<ClassifierResult | null> {
  const fallback = () => classifyTransaction(rawText);

  // Try Edge Function first (secret kept server-side)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-evidence', {
        body: { raw_text: rawText },
      });
      if (!error && data && typeof data.amount === 'number') {
        return normalizeGeminiResult(data);
      }
    } catch (e) {
      console.warn('Edge parse failed, trying direct Gemini', e);
    }
  }

  // Direct Gemini call if key available (client-side, for demo)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (apiKey && navigator.onLine) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(rawText) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 300, responseMimeType: 'application/json' },
          }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          return normalizeGeminiResult(parsed);
        }
      }
    } catch (e) {
      console.warn('Direct Gemini failed', e);
    }
  }

  // Rule-based fallback
  return fallback();
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
