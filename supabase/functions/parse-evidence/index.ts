// Supabase Edge Function: parse-evidence
// POST { raw_text } -> { amount, direction, category, date, confidence, provenance_label }
//
// Security:
//  - Requires a valid Supabase JWT (Authorization: Bearer <token>).
//  - Per-user sliding-window rate limit (protects the Gemini quota).
//  - GEMINI_API_KEY lives only in Supabase secrets — never shipped to the client.
// Deploy: supabase functions deploy parse-evidence

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_MODEL = "gemini-2.0-flash";
const ALLOWED_CATEGORIES = ["wages","crop_sale","shop_sale","transport_income","remittance","groceries","rent","medical","education","loan_repayment","utility","other"];

// ── Rate limiting (sliding window, per isolate) ──────────────────────────────
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function fallbackParse(rawText: string) {
  const text = rawText.toLowerCase();
  let amount = 0;
  const m = text.match(/(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (m) amount = parseFloat(m[1].replace(/,/g, "")) || 0;
  const isOut = /(debited|paid|debit|sent|purchase|payment)/.test(text);
  const date = new Date().toISOString().split("T")[0];
  return { amount, direction: isOut ? "out" : "in", category: "other", date, confidence: 0.45, provenance_label: "declared" as const };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  // ── 1. Authenticate the caller (JWT required) ──────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  // ── 2. Rate limit per user (and IP as a secondary dimension) ───────────────
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isRateLimited(`${user.id}:${ip}`)) {
    return jsonResponse({ error: "Too many requests — try again in a minute" }, 429);
  }

  // ── 3. Parse input ─────────────────────────────────────────────────────────
  try {
    const { raw_text } = await req.json();
    if (!raw_text || typeof raw_text !== "string") {
      return jsonResponse({ error: "raw_text required" }, 400);
    }
    const clipped = raw_text.slice(0, 2000);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ ...fallbackParse(clipped), _fallback: "no GEMINI_API_KEY" });
    }

    const prompt = `You are a financial receipt parser for rural Indian micro-entrepreneurs.
Extract a single transaction. Return ONLY JSON: {"amount": number, "direction": "in"|"out", "category": one of ${ALLOWED_CATEGORIES.join(",")}, "date": "YYYY-MM-DD", "confidence": 0.0-1.0}
OCR Text: """${clipped}"""`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400, responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      return jsonResponse({ ...fallbackParse(clipped), _fallback: `gemini ${res.status}` });
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(String(text).replace(/```json|```/g, "").trim());
    } catch {
      parsed = fallbackParse(clipped) as unknown as Record<string, unknown>;
    }

    const amount = Number(parsed.amount) || 0;
    const direction = parsed.direction === "out" ? "out" : "in";
    const category = ALLOWED_CATEGORIES.includes(String(parsed.category))
      ? String(parsed.category)
      : "other";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.date))
      ? String(parsed.date)
      : new Date().toISOString().split("T")[0];
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7));
    const provenance_label = confidence >= 0.7 ? "verified" : confidence >= 0.45 ? "declared" : "estimated";

    return jsonResponse({ amount, direction, category, date, confidence, provenance_label });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
