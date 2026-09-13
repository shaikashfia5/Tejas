// Supabase Edge Function: parse-evidence
// POST { raw_text } -> { amount, direction, category, date, confidence, provenance_label }
// Secret: GEMINI_API_KEY (set via `supabase secrets set GEMINI_API_KEY=...`)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_MODEL = "gemini-1.5-flash";
const ALLOWED_CATEGORIES = ["wages","crop_sale","shop_sale","transport_income","remittance","groceries","rent","medical","education","loan_repayment","utility","other"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function fallbackParse(rawText: string) {
  const text = rawText.toLowerCase();
  let amount = 0;
  const m = text.match(/(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (m) amount = parseFloat(m[1].replace(/,/g,"")) || 0;
  const isOut = /(debited|paid|debit|sent|purchase|payment)/.test(text);
  const date = new Date().toISOString().split("T")[0];
  return { amount, direction: isOut ? "out" : "in", category: "other", date, confidence: 0.45, provenance_label: "declared" as const };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { ...corsHeaders(), "Content-Type": "application/json" } });

  try {
    const { raw_text } = await req.json();
    if (!raw_text || typeof raw_text !== "string") {
      return new Response(JSON.stringify({ error: "raw_text required" }), { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY");
    if (!apiKey) {
      const fb = fallbackParse(raw_text);
      return new Response(JSON.stringify({ ...fb, _fallback: "no GEMINI_API_KEY" }), { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
    }

    const prompt = `You are a financial receipt parser for rural Indian micro-entrepreneurs.
Extract a single transaction. Return ONLY JSON: {"amount": number, "direction": "in"|"out", "category": one of ${ALLOWED_CATEGORIES.join(",")}, "date": "YYYY-MM-DD", "confidence": 0.0-1.0}
OCR Text: """${raw_text.slice(0, 2000)}"""`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      const fb = fallbackParse(raw_text);
      return new Response(JSON.stringify({ ...fb, _fallback: `gemini ${res.status}` }), { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text.replace(/```json|```/g,"").trim()); } catch { parsed = fallbackParse(raw_text) as unknown as Record<string, unknown>; }

    const amount = Number((parsed as Record<string, unknown>).amount) || 0;
    const direction = (parsed as Record<string, unknown>).direction === "out" ? "out" : "in";
    const category = ALLOWED_CATEGORIES.includes(String((parsed as Record<string, unknown>).category)) ? String((parsed as Record<string, unknown>).category) : "other";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String((parsed as Record<string, unknown>).date)) ? String((parsed as Record<string, unknown>).date) : new Date().toISOString().split("T")[0];
    const confidence = Math.max(0, Math.min(1, Number((parsed as Record<string, unknown>).confidence) || 0.7));
    const provenance_label = confidence >= 0.7 ? "verified" : confidence >= 0.45 ? "declared" : "estimated";

    return new Response(JSON.stringify({ amount, direction, category, date, confidence, provenance_label }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } });
  }
});
