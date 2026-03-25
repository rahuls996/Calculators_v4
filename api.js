/**
 * api.js — Pricing API stub for v4
 *
 * Simulates a real async Health & Life pricing API.
 * To integrate the real API: replace the body of `callPricingApi` with
 * a real fetch() call using the same params shape.
 *
 * Usage:
 *   const result = await fetchPrice('c5', { age: 30, income: 10, ... });
 * Health premium (c1) uses an on-page guide only — it does not call this API.
 */

function r100(n) { return Math.round(n / 100) * 100; }

// ─── Local formula implementations ──────────────────────────────────────────

function calcC5(p) {
  const yearsLeft = Math.max(p.retireAge - p.age, 1);
  const netAnnual = Math.max(p.income - p.expenses, 0) * 100000;
  const r = 0.06;
  const pv = netAnnual * ((1 - Math.pow(1 + r, -yearsLeft)) / r);
  const hlv = Math.max(Math.round(pv / 100000) * 100000, 500000);
  return { price: hlv, monthly: null, daily: null, coverText: 'Term cover from ₹500/month', isHLV: true };
}

const C6_COVER_STEPS = [2500000, 5000000, 7500000, 10000000, 20000000];

function getTermAgeFactor(age) {
  if (age <= 25) return 0.7;
  if (age <= 30) return 0.7 + (age - 25) * 0.06;
  if (age <= 35) return 1.0 + (age - 30) * 0.08;
  if (age <= 40) return 1.4 + (age - 35) * 0.12;
  if (age <= 50) return 2.0 + (age - 40) * 0.2;
  return 4.0 + (age - 50) * 0.35;
}

function getTermFactor(term) {
  if (term <= 10) return 0.75;
  if (term <= 20) return 0.75 + (term - 10) * 0.025;
  if (term <= 30) return 1.0 + (term - 20) * 0.04;
  return 1.4 + (term - 30) * 0.06;
}

function calcC6(p) {
  const cover = C6_COVER_STEPS[p.coverIndex];
  const coverInLakhs = cover / 100000;
  const baseAnnual = coverInLakhs * 28;
  const ageMul  = getTermAgeFactor(p.age);
  const termMul = getTermFactor(p.term);
  const ageComp   = r100(baseAnnual * (ageMul - 1));
  const coverComp = r100(baseAnnual * 0.15 * (coverInLakhs / 50 - 1));
  const termComp  = r100(baseAnnual * (termMul - 1));
  const total = Math.max(r100(baseAnnual + ageComp + coverComp + termComp), 3000);
  const daily = Math.ceil(total / 365);
  const coverLabel = cover >= 10000000
    ? '₹' + (cover / 10000000).toFixed(0) + ' Cr life cover'
    : '₹' + (cover / 100000).toFixed(0) + ' L life cover';
  return { price: total, monthly: Math.ceil(total / 12), daily, coverText: coverLabel };
}

// ─── Formula dispatch map ────────────────────────────────────────────────────

const formulaMap = { c5: calcC5, c6: calcC6 };

// ─── Mock network call ───────────────────────────────────────────────────────

/**
 * Simulates a real API call with ~800ms latency.
 * Replace this function body with a real fetch() when the API is ready:
 *
 *   const res = await fetch('https://api.acko.com/v1/pricing/' + calcId, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(params)
 *   });
 *   if (!res.ok) throw new Error('API_ERROR');
 *   return await res.json();
 */
async function callPricingApi(calcId, params) {
  const LATENCY_MS = 800;
  // Failure rate set to 0 for mock — real failures come from the live API
  const FAILURE_RATE = 0;

  await new Promise(resolve => setTimeout(resolve, LATENCY_MS));

  if (Math.random() < FAILURE_RATE) {
    throw new Error('API_ERROR');
  }

  const formula = formulaMap[calcId];
  if (!formula) throw new Error('Unknown calculator: ' + calcId);
  return formula(params);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch price for a given calculator with its current params.
 * @param {string} calcId  - 'c5' or 'c6' (health premium c1 is handled in script.js)
 * @param {object} params  - input values collected from calculator state
 * @returns {Promise<{price, monthly, daily, coverText, isYears?, isHLV?}>}
 */
async function fetchPrice(calcId, params) {
  return callPricingApi(calcId, params);
}
