document.addEventListener('DOMContentLoaded', () => {

  // =============================================
  // Shared Utilities
  // =============================================

  const cityRiskMap = {
    mumbai: 1.4, delhi: 1.35, bengaluru: 1.2, chennai: 1.15,
    hyderabad: 1.1, kolkata: 1.1, pune: 1.15, ahmedabad: 1.05,
    jaipur: 1.0, other: 0.9
  };

  function formatINR(amount) {
    const rounded = Math.round(amount / 100) * 100;
    return '₹ ' + rounded.toLocaleString('en-IN');
  }

  function formatLakhsWithRupee(val) {
    if (val >= 100) return '₹1Cr';
    if (val === 0) return '₹0';
    return '₹' + val + 'L';
  }

  function updateSliderProgress(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-progress', pct + '%');
  }

  const rollState = new WeakMap();

  function parseNumber(text) {
    const digits = text.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function animateAmount(el, text) {
    const currentText = el.dataset.currentText || el.textContent.trim();
    if (currentText === text) return;

    const prev = rollState.get(el);
    if (prev) cancelAnimationFrame(prev.raf);

    const fromVal = parseNumber(currentText);
    const toVal = parseNumber(text);
    const prefix = text.match(/^[^0-9]*/)[0];
    const isYears = /years?$/i.test(text);

    el.dataset.currentText = text;

    if (fromVal === toVal) { el.textContent = text; return; }

    const duration = 350;
    const start = performance.now();
    const diff = toVal - fromVal;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      let current = Math.round(fromVal + diff * eased);

      if (isYears) {
        el.textContent = current + ' years';
      } else {
        current = Math.round(current / 100) * 100;
        el.textContent = prefix + current.toLocaleString('en-IN');
      }

      if (progress < 1) {
        const state = { raf: requestAnimationFrame(tick) };
        rollState.set(el, state);
      } else {
        el.textContent = text;
        rollState.delete(el);
      }
    }

    rollState.set(el, { raf: requestAnimationFrame(tick) });
  }

  function initAllSliders() {
    document.querySelectorAll('.custom-slider').forEach(updateSliderProgress);
  }

  function initSearchableSelects() {
    document.querySelectorAll('.searchable-select').forEach(select => {
      const trigger = select.querySelector('.searchable-select-trigger');
      const textEl = select.querySelector('.searchable-select-text');
      const input = select.querySelector('.searchable-select-input');
      const options = select.querySelectorAll('.searchable-select-options li');

      const currentValue = select.dataset.value;
      options.forEach(opt => {
        if (opt.dataset.value === currentValue) opt.classList.add('selected');
      });

      trigger.addEventListener('click', () => {
        const wasOpen = select.classList.contains('open');
        document.querySelectorAll('.searchable-select.open').forEach(s => s.classList.remove('open'));
        if (!wasOpen) {
          select.classList.add('open');
          input.value = '';
          options.forEach(opt => opt.classList.remove('hidden'));
          setTimeout(() => input.focus(), 50);
        }
      });

      const noResults = select.querySelector('.searchable-select-no-results');

      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        let visibleCount = 0;
        options.forEach(opt => {
          const match = opt.textContent.toLowerCase().includes(query);
          opt.classList.toggle('hidden', !match);
          if (match) visibleCount++;
        });
        if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
      });

      input.addEventListener('click', (e) => e.stopPropagation());

      options.forEach(opt => {
        opt.addEventListener('click', () => {
          const value = opt.dataset.value;
          const label = opt.textContent;
          select.dataset.value = value;
          textEl.textContent = label;
          options.forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          select.classList.remove('open');
          select.dispatchEvent(new CustomEvent('change', { detail: { value } }));
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.searchable-select')) {
        document.querySelectorAll('.searchable-select.open').forEach(s => s.classList.remove('open'));
      }
    });
  }

  // =============================================
  // Loading / Error / Result state helpers
  // =============================================

  function getResultsPanel(calcId) {
    const emptyEl = document.getElementById(calcId + '-empty');
    return emptyEl ? emptyEl.closest('.results-panel') : null;
  }

  function setLoadingState(calcId, isLoading) {
    const skeleton  = document.getElementById(calcId + '-skeleton');
    const resultEl  = document.getElementById(calcId + '-result');
    const emptyEl   = document.getElementById(calcId + '-empty');
    const panel     = getResultsPanel(calcId);
    const btn       = document.querySelector('.cta-button[data-calc="' + calcId + '"]');

    if (isLoading) {
      if (panel)    panel.classList.remove('results-empty');
      if (emptyEl)  emptyEl.hidden  = true;
      if (resultEl) resultEl.hidden = true;
      if (skeleton) skeleton.hidden = false;
      if (btn) {
        btn.disabled = true;
        btn.classList.add('cta-loading');
        btn.dataset.originalText = btn.textContent.trim();
        btn.innerHTML = '<span class="cta-spinner"></span>Getting your price…';
      }
    } else {
      if (skeleton) skeleton.hidden = true;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('cta-loading');
        if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      }
    }
  }

  function markStale(calcId) {
    const resultEl = document.getElementById(calcId + '-result');
    const plansEl  = document.getElementById(calcId + '-plans');
    const shieldEl = document.getElementById(calcId + '-shield');
    const btn      = document.querySelector('.cta-button[data-calc="' + calcId + '"]');

    // Only act if a result is currently visible
    if (!resultEl || resultEl.hidden) return;

    if (resultEl) resultEl.classList.add('result-stale');
    if (plansEl)  plansEl.classList.add('result-stale');
    if (shieldEl) shieldEl.classList.add('result-stale');
    if (btn && !btn.classList.contains('cta-stale')) {
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent.trim();
      btn.innerHTML = '<span class="cta-refresh-icon">↻</span> Update my price';
      btn.classList.add('cta-stale');
    }
  }

  function clearStale(calcId) {
    const resultEl = document.getElementById(calcId + '-result');
    const plansEl  = document.getElementById(calcId + '-plans');
    const shieldEl = document.getElementById(calcId + '-shield');
    const btn      = document.querySelector('.cta-button[data-calc="' + calcId + '"]');
    if (resultEl) resultEl.classList.remove('result-stale');
    if (plansEl)  plansEl.classList.remove('result-stale');
    if (shieldEl) shieldEl.classList.remove('result-stale');
    if (btn && btn.classList.contains('cta-stale')) {
      btn.classList.remove('cta-stale');
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  }

  function showResult(calcId, result) {
    const resultEl  = document.getElementById(calcId + '-result');
    const emptyEl   = document.getElementById(calcId + '-empty');
    const plansEl   = document.getElementById(calcId + '-plans');
    const shieldEl  = document.getElementById(calcId + '-shield');
    const panel     = getResultsPanel(calcId);
    if (panel)    panel.classList.remove('results-empty');
    if (emptyEl)  emptyEl.hidden  = true;
    if (shieldEl) shieldEl.hidden = false;
    if (resultEl) resultEl.hidden = false;
    if (plansEl)  plansEl.hidden  = false;
    clearStale(calcId);
    renderResult(calcId, result);
  }

  function renderResult(calcId, result) {
    if (calcId === 'c1') {
      animateAmount(document.getElementById('c1-premiumAmount'), formatINR(result.price));
      const plansEl = document.getElementById('c1-plansText');
      if (plansEl) plansEl.textContent = result.coverText;
      const perdayEl = document.getElementById('c1-perDay');
      if (perdayEl) perdayEl.textContent = result.daily ? '₹' + result.daily + '/day. Less than your morning chai.' : '';
    } else if (calcId === 'c5') {
      animateAmount(document.getElementById('c5-hlvAmount'), '₹ ' + result.price.toLocaleString('en-IN'));
    } else if (calcId === 'c6') {
      animateAmount(document.getElementById('c6-premiumAmount'), formatINR(result.price));
      const plansEl = document.getElementById('c6-plansText');
      if (plansEl) plansEl.textContent = result.coverText;
      const perdayEl = document.getElementById('c6-perDay');
      if (perdayEl) perdayEl.textContent = result.daily ? '₹' + result.daily + '/day to make sure they never struggle' : '';
    }
    updateBuyCtaUrls();
  }

  // =============================================
  // Main fetch trigger — called by CTA
  // =============================================

  async function triggerFetch(calcId) {
    const calcObj = { c1, c5, c6 }[calcId];
    if (!calcObj) return;

    const params = calcObj.getParams();
    setLoadingState(calcId, true);

    try {
      const result = await fetchPrice(calcId, params);
      setLoadingState(calcId, false);
      showResult(calcId, result);

      // On mobile, scroll results into view after load
      if (window.innerWidth <= 900) {
        const section = document.querySelector('.cta-button[data-calc="' + calcId + '"]')
          ?.closest('.calculator-section');
        const panel = section?.querySelector('.results-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      setLoadingState(calcId, false);
    }
  }

  // =============================================
  // CALCULATOR 1: Health Insurance Calculator
  // =============================================

  const c1 = {
    coverSteps: [10, 25, 50, 100],
    coverLabels: ['₹10 L', '₹25 L', '₹50 L', '₹1 Cr'],

    state: { age: 30, coverIndex: 0, adults: 1, children: 0, parents: 0, city: 'bengaluru' },

    getParams() {
      return {
        age: this.state.age,
        coverIndex: this.state.coverIndex,
        adults: this.state.adults,
        children: this.state.children,
        parents: this.state.parents,
        city: this.state.city
      };
    },

    updateStepperButtons() {
      document.getElementById('c1-adults-dec').disabled  = this.state.adults <= 1;
      document.getElementById('c1-adults-inc').disabled  = this.state.adults >= 4;
      document.getElementById('c1-children-dec').disabled = this.state.children <= 0;
      document.getElementById('c1-children-inc').disabled = this.state.children >= 4;
      document.getElementById('c1-parents-dec').disabled  = this.state.parents <= 0;
      document.getElementById('c1-parents-inc').disabled  = this.state.parents >= 2;
    },

    initStepper(decId, incId, valId, stateKey, min, max) {
      document.getElementById(decId).addEventListener('click', () => {
        if (this.state[stateKey] > min) {
          this.state[stateKey]--;
          const el = document.getElementById(valId);
          el.textContent = this.state[stateKey];
          el.dataset.zero = this.state[stateKey] === 0 ? 'true' : 'false';
          this.updateStepperButtons();
          markStale('c1');
        }
      });
      document.getElementById(incId).addEventListener('click', () => {
        if (this.state[stateKey] < max) {
          this.state[stateKey]++;
          const el = document.getElementById(valId);
          el.textContent = this.state[stateKey];
          el.dataset.zero = this.state[stateKey] === 0 ? 'true' : 'false';
          this.updateStepperButtons();
          markStale('c1');
        }
      });
    },

    init() {
      document.getElementById('c1-ageSlider').addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c1-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        markStale('c1');
      });

      document.getElementById('c1-coverSlider').addEventListener('input', (e) => {
        this.state.coverIndex = parseInt(e.target.value);
        document.getElementById('c1-coverValue').textContent = this.coverLabels[this.state.coverIndex];
        updateSliderProgress(e.target);
        markStale('c1');
      });

      document.getElementById('c1-citySelect').addEventListener('change', (e) => {
        this.state.city = e.detail.value;
        markStale('c1');
      });

      this.initStepper('c1-adults-dec', 'c1-adults-inc', 'c1-adults-val', 'adults', 1, 4);
      this.initStepper('c1-children-dec', 'c1-children-inc', 'c1-children-val', 'children', 0, 4);
      this.initStepper('c1-parents-dec', 'c1-parents-inc', 'c1-parents-val', 'parents', 0, 2);
      this.updateStepperButtons();
    }
  };

  // =============================================
  // CALCULATOR 5: HLV (Human Life Value) Calculator
  // =============================================

  const c5 = {
    state: { age: 30, income: 10, expenses: 4, retireAge: 60 },

    getParams() {
      return { ...this.state };
    },

    init() {
      document.getElementById('c5-ageSlider').addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c5-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        markStale('c5');
      });

      document.getElementById('c5-incomeSlider').addEventListener('input', (e) => {
        this.state.income = parseInt(e.target.value);
        document.getElementById('c5-incomeValue').textContent = formatLakhsWithRupee(this.state.income);
        updateSliderProgress(e.target);
        markStale('c5');
      });

      document.getElementById('c5-expensesSlider').addEventListener('input', (e) => {
        this.state.expenses = parseInt(e.target.value);
        document.getElementById('c5-expensesValue').textContent = formatLakhsWithRupee(this.state.expenses);
        updateSliderProgress(e.target);
        markStale('c5');
      });

      document.getElementById('c5-retireSlider').addEventListener('input', (e) => {
        this.state.retireAge = parseInt(e.target.value);
        document.getElementById('c5-retireValue').textContent = this.state.retireAge + ' yrs';
        updateSliderProgress(e.target);
        markStale('c5');
      });
    }
  };

  // =============================================
  // CALCULATOR 6: Term Insurance Calculator
  // =============================================

  const c6 = {
    coverSteps: [2500000, 5000000, 7500000, 10000000, 20000000],
    coverLabels: ['₹25 L', '₹50 L', '₹75 L', '₹1 Cr', '₹2 Cr'],

    state: { age: 30, coverIndex: 1, term: 20, income: 10 },

    getParams() {
      return { ...this.state };
    },

    init() {
      document.getElementById('c6-ageSlider').addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c6-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        markStale('c6');
      });

      document.getElementById('c6-coverSlider').addEventListener('input', (e) => {
        this.state.coverIndex = parseInt(e.target.value);
        document.getElementById('c6-coverValue').textContent = this.coverLabels[this.state.coverIndex];
        updateSliderProgress(e.target);
        markStale('c6');
      });

      document.getElementById('c6-termSlider').addEventListener('input', (e) => {
        this.state.term = parseInt(e.target.value);
        document.getElementById('c6-termValue').textContent = this.state.term + ' yrs';
        updateSliderProgress(e.target);
        markStale('c6');
      });

      document.getElementById('c6-incomeSlider').addEventListener('input', (e) => {
        this.state.income = parseInt(e.target.value);
        document.getElementById('c6-incomeValue').textContent = formatLakhsWithRupee(this.state.income);
        updateSliderProgress(e.target);
        markStale('c6');
      });
    }
  };

  // =============================================
  // Global: Multi-select toggle buttons (Calc 3 goals)
  // =============================================

  document.querySelectorAll('.multi-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const calc = btn.dataset.calc;
      const group = btn.dataset.group;

      const selected = [];
      document.querySelectorAll(`.multi-btn[data-calc="${calc}"][data-group="${group}"].active`).forEach((b) => {
        selected.push(b.dataset.value);
      });

      const calcObj = { c1, c5, c6 }[calc];
      if (calcObj) calcObj.state[group] = selected;
    });
  });

  // =============================================
  // Global: CTA Buttons — trigger API fetch
  // =============================================

  document.querySelectorAll('.cta-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const calcId = btn.dataset.calc;
      triggerFetch(calcId);
    });
  });

  // =============================================
  // Tab Navigation
  // =============================================

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.calculator-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(targetId).classList.add('active');

      document.querySelectorAll('.searchable-select.open').forEach(s => s.classList.remove('open'));

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // =============================================
  // Plans CTA — Dynamic URL with calculator params
  // =============================================

  const plansBaseUrls = {
    c1: 'https://www.acko.com/health-insurance/buy',
    c5: 'https://www.acko.com/term-life-insurance/buy',
    c6: 'https://www.acko.com/term-life-insurance/buy'
  };

  function buildPlansUrl(calcId) {
    const base = plansBaseUrls[calcId] || '#';
    const params = new URLSearchParams();
    params.set('utm_source', 'calculator');
    params.set('utm_medium', 'seo');

    const calcObj = { c1, c5, c6 }[calcId];
    if (!calcObj) return base;

    params.set('age', calcObj.state.age);

    if (calcId === 'c1') {
      const coverSteps = [1000000, 2500000, 5000000, 10000000];
      params.set('cover',    coverSteps[c1.state.coverIndex] + '');
      params.set('adults',   c1.state.adults);
      params.set('children', c1.state.children);
      params.set('city',     c1.state.city);
    } else if (calcId === 'c5') {
      params.set('income', c5.state.income);
    } else if (calcId === 'c6') {
      const coverSteps = [2500000, 5000000, 7500000, 10000000, 20000000];
      params.set('cover',  coverSteps[c6.state.coverIndex] + '');
      params.set('term',   c6.state.term);
      params.set('income', c6.state.income);
    }

    return base + '?' + params.toString();
  }

  function updateBuyCtaUrls() {
    ['c1', 'c5', 'c6'].forEach(id => {
      const el = document.getElementById(id + '-plansBtn');
      if (el) el.href = buildPlansUrl(id);
    });
  }

  // =============================================
  // Initialize
  // =============================================

  initAllSliders();
  initSearchableSelects();
  c1.init();
  c5.init();
  c6.init();
  updateBuyCtaUrls();

  // Mark all results panels as empty on load (hides them on mobile)
  ['c1', 'c5', 'c6'].forEach(id => {
    const panel = getResultsPanel(id);
    if (panel) panel.classList.add('results-empty');
  });
});
