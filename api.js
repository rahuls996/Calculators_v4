/**
 * api.js — Pricing API stub for v4
 *
 * Simulates a real async Health & Life pricing API.
 * To integrate the real API: replace the body of `callPricingApi` with
 * a real fetch() call using the same params shape.
 *
 * Usage:
 *   const result = await fetchPrice('c1', { age: 30, coverIndex: 0, ... });
 *   // result: { price: 13700, monthly: 1142, daily: 38, coverText: '₹1 Cr life cover' }
 */

// ─── Shared formula helpers (mirrors script.js) ─────────────────────────────

const cityRiskMap = {
  mumbai: 1.4, delhi: 1.35, bengaluru: 1.2, chennai: 1.15,
  hyderabad: 1.1, kolkata: 1.1, pune: 1.15, ahmedabad: 1.05,
  jaipur: 1.0, other: 0.9
};

function getAgeMultiplier(age) {
  if (age <= 25) return 0.6;
  if (age <= 35) return 0.8 + (age - 25) * 0.04;
  if (age <= 45) return 1.2 + (age - 35) * 0.08;
  if (age <= 55) return 2.0 + (age - 45) * 0.15;
  if (age <= 65) return 3.5 + (age - 55) * 0.25;
  return 6.0 + (age - 65) * 0.35;
}

function r100(n) { return Math.round(n / 100) * 100; }

// ─── Local formula implementations ──────────────────────────────────────────

const C1_COVER_STEPS = [10, 25, 50, 100];

function calcC1(p) {
  const base = 5000;
  const ageComp   = r100(base * getAgeMultiplier(p.age) - base);
  const cityMul   = cityRiskMap[p.city] || 1.0;
  const cityComp  = r100(base * (cityMul - 1) * 2);
  const cover     = C1_COVER_STEPS[p.coverIndex];
  const coverComp = r100(base * (cover / 10 - 1) * 0.3);
  const memberComp = r100((p.adults - 1) * 1500 + p.children * 600 + p.parents * 2800);
  const total = Math.max(base + ageComp + cityComp + coverComp + memberComp, 2000);
  const monthly = Math.ceil(total / 12);
  const daily   = Math.ceil(total / 365);
  return { price: total, monthly, daily, coverText: 'Starting at ₹' + monthly.toLocaleString('en-IN') + '/month' };
}

function calcC2(p) {
  const base = 5000;
  const ageComp      = r100(base * getAgeMultiplier(p.age) - base);
  const cityMul      = cityRiskMap[p.city] || 1.0;
  const cityComp     = r100(base * (cityMul - 1) * 2);
  const familyComp   = r100((p.family - 1) * 1550);
  const incomeFactor = r100(p.income * 30);
  const existingDisc = -r100(p.existing * 15);
  const companyDisc  = -r100(p.company * 10);
  const total = Math.max(base + ageComp + cityComp + familyComp + incomeFactor + existingDisc + companyDisc, 2000);
  const monthly = Math.ceil(total / 12);
  const daily   = Math.ceil(total / 365);
  return { price: total, monthly, daily, coverText: 'Starting at ₹' + monthly.toLocaleString('en-IN') + '/month' };
}

function calcC3(p) {
  const annualIncome  = p.income * 100000;
  const annualExpenses = p.expenses * 12;
  const yearsToRetire = Math.max(60 - p.age, 5);
  const rawNeed = annualIncome * Math.min(yearsToRetire, 20)
    + annualExpenses * 10
    + p.liabilities * 100000
    + (p.goals ? p.goals.length : 0) * 1500000
    - p.existing * 100000;
  const recommended = Math.max(rawNeed, 2500000);
  const base = 6000;
  const ageComp      = r100(base * getAgeMultiplier(p.age) - base);
  const dependentComp = r100((p.dependents - 1) * 1200);
  const coverFactor  = r100(recommended / 1000000 * 800);
  const liabilityComp = r100(p.liabilities * 200);
  const total = Math.max(base + ageComp + dependentComp + coverFactor + liabilityComp, 3000);
  const daily = Math.ceil(total / 365);
  const coverCr = (recommended / 10000000).toFixed(1);
  const coverText = recommended >= 10000000
    ? '₹' + coverCr + ' Cr life cover'
    : '₹' + (recommended / 100000).toFixed(0) + ' L life cover';
  return { price: total, monthly: Math.ceil(total / 12), daily, coverText };
}

function calcC4(p) {
  const workingYears  = Math.max(p.retireAge - p.age, 1);
  const dependentYears = p.dependents * 3;
  const liabilityYears = Math.min(Math.ceil(p.liabilities / 5) * 2, 15);
  const annualIncome  = p.income * 100000;
  const annualExpenses = p.expenses * 12;
  const expenseRatio  = annualExpenses / Math.max(annualIncome, 1);
  const extraYears    = expenseRatio > 0.6 ? 5 : expenseRatio > 0.4 ? 3 : 0;
  const years = Math.min(Math.max(Math.max(workingYears, dependentYears, liabilityYears) + extraYears, 5), 50);
  return { price: years, monthly: null, daily: null, coverText: 'Plans from ₹500/month', isYears: true };
}

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

const formulaMap = { c1: calcC1, c2: calcC2, c3: calcC3, c4: calcC4, c5: calcC5, c6: calcC6 };

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
  const FAILURE_RATE = 0.1; // 10% simulated failures to test error handling

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
 * @param {string} calcId  - 'c1' through 'c6'
 * @param {object} params  - input values collected from calculator state
 * @returns {Promise<{price, monthly, daily, coverText, isYears?, isHLV?}>}
 */
async function fetchPrice(calcId, params) {
  return callPricingApi(calcId, params);
}
