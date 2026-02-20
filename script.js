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

  function formatImpact(val) {
    if (val >= 0) return '+₹' + val.toLocaleString('en-IN');
    return '-₹' + Math.abs(val).toLocaleString('en-IN');
  }

  function formatLakhs(val) {
    if (val >= 100) return '₹1Cr';
    if (val === 0) return '₹0';
    return '₹' + val + 'L';
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

  function getAgeMultiplier(age) {
    if (age <= 25) return 0.6;
    if (age <= 35) return 0.8 + (age - 25) * 0.04;
    if (age <= 45) return 1.2 + (age - 35) * 0.08;
    if (age <= 55) return 2.0 + (age - 45) * 0.15;
    if (age <= 65) return 3.5 + (age - 55) * 0.25;
    return 6.0 + (age - 65) * 0.35;
  }

  function animateAmount(el, text) {
    el.classList.add('updating');
    setTimeout(() => {
      el.textContent = text;
      el.classList.remove('updating');
    }, 150);
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

      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        options.forEach(opt => {
          const match = opt.textContent.toLowerCase().includes(query);
          opt.classList.toggle('hidden', !match);
        });
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
  // CALCULATOR 1: Health Insurance Calculator
  // =============================================

  const c1 = {
    state: { age: 30, cover: 30, family: 3, gender: 'male', city: 'bengaluru', tobacco: 'no' },

    calculate() {
      const base = 5000;
      const ageMul = getAgeMultiplier(this.state.age);
      const ageComp = Math.round((base * ageMul - base) / 100) * 100;
      const cityMul = cityRiskMap[this.state.city] || 1.0;
      const cityComp = Math.round((base * (cityMul - 1) * 2) / 100) * 100;
      const familyComp = Math.round((this.state.family - 1) * 1550 / 100) * 100;
      const coverMul = this.state.cover / 10;
      const coverComp = Math.round(base * (coverMul - 1) * 0.3 / 100) * 100;
      const smokerComp = this.state.tobacco === 'yes'
        ? Math.round(base * 0.35 / 100) * 100
        : -Math.round(base * 0.16 / 100) * 100;
      const genderAdj = this.state.gender === 'female' ? -200 : 0;
      const total = Math.max(base + ageComp + cityComp + familyComp + coverComp + smokerComp + genderAdj, 2000);
      return { total, age: ageComp, city: cityComp, family: familyComp, smoker: smokerComp };
    },

    update() {
      const r = this.calculate();
      animateAmount(document.getElementById('c1-premiumAmount'), formatINR(r.total));
      document.getElementById('c1-ageImpact').textContent = formatImpact(r.age);
      document.getElementById('c1-cityImpact').textContent = formatImpact(r.city);
      document.getElementById('c1-familyImpact').textContent = formatImpact(r.family);
      const label = this.state.tobacco === 'yes' ? 'Tobacco surcharge' : 'Non-smoker benefit';
      document.getElementById('c1-smokerText').innerHTML = label + ' <strong id="c1-smokerImpact">' + formatImpact(r.smoker) + '</strong>';
    },

    init() {
      const ageSlider = document.getElementById('c1-ageSlider');
      const coverSlider = document.getElementById('c1-coverSlider');
      const familySlider = document.getElementById('c1-familySlider');
      const citySelect = document.getElementById('c1-citySelect');

      ageSlider.addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c1-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        this.update();
      });

      coverSlider.addEventListener('input', (e) => {
        this.state.cover = parseInt(e.target.value);
        document.getElementById('c1-coverValue').textContent = formatLakhsWithRupee(this.state.cover);
        updateSliderProgress(e.target);
        this.update();
      });

      familySlider.addEventListener('input', (e) => {
        this.state.family = parseInt(e.target.value);
        document.getElementById('c1-familyValue').textContent = this.state.family;
        updateSliderProgress(e.target);
        this.update();
      });

      citySelect.addEventListener('change', (e) => {
        this.state.city = e.detail.value;
        this.update();
      });

      this.update();
    }
  };

  // =============================================
  // CALCULATOR 2: Health Cover Recommendation
  // =============================================

  const c2 = {
    state: { age: 30, income: 30, family: 2, existing: 30, company: 5, city: 'bengaluru', tobacco: 'no' },

    calculate() {
      const base = 5000;
      const ageMul = getAgeMultiplier(this.state.age);
      const ageComp = Math.round((base * ageMul - base) / 100) * 100;
      const cityMul = cityRiskMap[this.state.city] || 1.0;
      const cityComp = Math.round((base * (cityMul - 1) * 2) / 100) * 100;
      const familyComp = Math.round((this.state.family - 1) * 1550 / 100) * 100;
      const incomeFactor = Math.round(this.state.income * 30 / 100) * 100;
      const existingDiscount = -Math.round(this.state.existing * 15 / 100) * 100;
      const companyDiscount = -Math.round(this.state.company * 10 / 100) * 100;
      const smokerComp = this.state.tobacco === 'yes'
        ? Math.round(base * 0.35 / 100) * 100
        : -Math.round(base * 0.16 / 100) * 100;
      const total = Math.max(base + ageComp + cityComp + familyComp + incomeFactor + existingDiscount + companyDiscount + smokerComp, 2000);
      return { total, age: ageComp, city: cityComp, family: familyComp, smoker: smokerComp };
    },

    update() {
      const r = this.calculate();
      animateAmount(document.getElementById('c2-premiumAmount'), formatINR(r.total));
      document.getElementById('c2-ageImpact').textContent = formatImpact(r.age);
      document.getElementById('c2-cityImpact').textContent = formatImpact(r.city);
      document.getElementById('c2-familyImpact').textContent = formatImpact(r.family);
      const label = this.state.tobacco === 'yes' ? 'Tobacco surcharge' : 'Non-smoker benefit';
      document.getElementById('c2-smokerText').innerHTML = label + ' <strong id="c2-smokerImpact">' + formatImpact(r.smoker) + '</strong>';
    },

    init() {
      const sliders = {
        age: document.getElementById('c2-ageSlider'),
        income: document.getElementById('c2-incomeSlider'),
        family: document.getElementById('c2-familySlider'),
        existing: document.getElementById('c2-existingSlider'),
        company: document.getElementById('c2-companySlider')
      };

      sliders.age.addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c2-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        this.update();
      });

      sliders.income.addEventListener('input', (e) => {
        this.state.income = parseInt(e.target.value);
        document.getElementById('c2-incomeValue').textContent = formatLakhsWithRupee(this.state.income);
        updateSliderProgress(e.target);
        this.update();
      });

      sliders.family.addEventListener('input', (e) => {
        this.state.family = parseInt(e.target.value);
        document.getElementById('c2-familyValue').textContent = this.state.family;
        updateSliderProgress(e.target);
        this.update();
      });

      sliders.existing.addEventListener('input', (e) => {
        this.state.existing = parseInt(e.target.value);
        document.getElementById('c2-existingValue').textContent = formatLakhsWithRupee(this.state.existing);
        updateSliderProgress(e.target);
        this.update();
      });

      sliders.company.addEventListener('input', (e) => {
        this.state.company = parseInt(e.target.value);
        document.getElementById('c2-companyValue').textContent = formatLakhsWithRupee(this.state.company);
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c2-citySelect').addEventListener('change', (e) => {
        this.state.city = e.detail.value;
        this.update();
      });

      this.update();
    }
  };

  // =============================================
  // CALCULATOR 3: Term Cover Recommendation
  // =============================================

  const c3 = {
    state: { age: 30, income: 5, expenses: 10000, dependents: 2, existing: 30, liabilities: 2, goals: ['education'] },

    calculate() {
      const annualIncome = this.state.income * 100000;
      const annualExpenses = this.state.expenses * 12;
      const yearsToRetire = Math.max(60 - this.state.age, 5);

      const incomeReplacement = annualIncome * Math.min(yearsToRetire, 20);
      const expenseCover = annualExpenses * 10;
      const liabilityAmount = this.state.liabilities * 100000;
      const goalAmount = this.state.goals.length * 1500000;
      const existingCover = this.state.existing * 100000;

      const rawNeed = incomeReplacement + expenseCover + liabilityAmount + goalAmount - existingCover;
      const recommended = Math.max(rawNeed, 2500000);

      const base = 6000;
      const ageMul = getAgeMultiplier(this.state.age);
      const ageComp = Math.round((base * ageMul - base) / 100) * 100;
      const dependentComp = Math.round((this.state.dependents - 1) * 1200 / 100) * 100;
      const coverFactor = Math.round(recommended / 1000000 * 800 / 100) * 100;
      const liabilityComp = Math.round(this.state.liabilities * 200 / 100) * 100;

      const total = Math.max(base + ageComp + dependentComp + coverFactor + liabilityComp, 3000);
      return { total, age: ageComp, cover: coverFactor, family: dependentComp, liability: liabilityComp };
    },

    update() {
      const r = this.calculate();
      animateAmount(document.getElementById('c3-premiumAmount'), formatINR(r.total));
      document.getElementById('c3-ageImpact').textContent = formatImpact(r.age);
      document.getElementById('c3-cityImpact').textContent = formatImpact(r.cover);
      document.getElementById('c3-familyImpact').textContent = formatImpact(r.family);
      document.getElementById('c3-smokerText').innerHTML = 'Liability adjustment <strong id="c3-smokerImpact">' + formatImpact(r.liability) + '</strong>';
    },

    init() {
      document.getElementById('c3-ageSlider').addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c3-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c3-incomeSlider').addEventListener('input', (e) => {
        this.state.income = parseInt(e.target.value);
        document.getElementById('c3-incomeValue').textContent = formatLakhsWithRupee(this.state.income);
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c3-expensesSlider').addEventListener('input', (e) => {
        this.state.expenses = parseInt(e.target.value);
        document.getElementById('c3-expensesValue').textContent = '₹' + this.state.expenses.toLocaleString('en-IN');
        updateSliderProgress(e.target);
        this.update();
      });



      document.getElementById('c3-dependentsSlider').addEventListener('input', (e) => {
        this.state.dependents = parseInt(e.target.value);
        document.getElementById('c3-dependentsValue').textContent = this.state.dependents;
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c3-existingSlider').addEventListener('input', (e) => {
        this.state.existing = parseInt(e.target.value);
        document.getElementById('c3-existingValue').textContent = formatLakhsWithRupee(this.state.existing);
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c3-liabilitiesSlider').addEventListener('input', (e) => {
        this.state.liabilities = parseInt(e.target.value);
        document.getElementById('c3-liabilitiesValue').textContent = formatLakhsWithRupee(this.state.liabilities);
        updateSliderProgress(e.target);
        this.update();
      });

      this.update();
    }
  };

  // =============================================
  // CALCULATOR 4: Term Duration Helper
  // =============================================

  const c4 = {
    state: { age: 30, dependents: 2, liabilities: 2, income: 5, expenses: 10000, retireAge: 55 },

    calculate() {
      const workingYears = Math.max(this.state.retireAge - this.state.age, 1);
      const dependentYears = this.state.dependents * 3;
      const liabilityYears = Math.min(Math.ceil(this.state.liabilities / 5) * 2, 15);
      const annualIncome = this.state.income * 100000;
      const annualExpenses = this.state.expenses * 12;
      const expenseRatio = annualExpenses / Math.max(annualIncome, 1);
      const extraYears = expenseRatio > 0.6 ? 5 : expenseRatio > 0.4 ? 3 : 0;

      const recommended = Math.max(workingYears, dependentYears, liabilityYears) + extraYears;
      const capped = Math.min(Math.max(recommended, 5), 50);
      return { years: capped, retireAge: this.state.retireAge };
    },

    update() {
      const r = this.calculate();
      animateAmount(document.getElementById('c4-yearsAmount'), r.years + ' years');
      document.getElementById('c4-point1').innerHTML =
        'Covers your earning years until retirement at <strong>' + r.retireAge + '</strong>';
    },

    init() {
      document.getElementById('c4-ageSlider').addEventListener('input', (e) => {
        this.state.age = parseInt(e.target.value);
        document.getElementById('c4-ageValue').textContent = this.state.age;
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c4-dependentsSlider').addEventListener('input', (e) => {
        this.state.dependents = parseInt(e.target.value);
        document.getElementById('c4-dependentsValue').textContent = this.state.dependents;
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c4-liabilitiesSlider').addEventListener('input', (e) => {
        this.state.liabilities = parseInt(e.target.value);
        document.getElementById('c4-liabilitiesValue').textContent = formatLakhsWithRupee(this.state.liabilities);
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c4-incomeSlider').addEventListener('input', (e) => {
        this.state.income = parseInt(e.target.value);
        document.getElementById('c4-incomeValue').textContent = formatLakhsWithRupee(this.state.income);
        updateSliderProgress(e.target);
        this.update();
      });

      document.getElementById('c4-expensesSlider').addEventListener('input', (e) => {
        this.state.expenses = parseInt(e.target.value);
        document.getElementById('c4-expensesValue').textContent = '₹' + this.state.expenses.toLocaleString('en-IN');
        updateSliderProgress(e.target);
        this.update();
      });


      document.getElementById('c4-retireSlider').addEventListener('input', (e) => {
        this.state.retireAge = parseInt(e.target.value);
        document.getElementById('c4-retireValue').textContent = this.state.retireAge + ' yrs';
        updateSliderProgress(e.target);
        this.update();
      });

      this.update();
    }
  };

  // =============================================
  // Global: Toggle Buttons (single-select per group per calculator)
  // =============================================

  document.querySelectorAll('.toggle-btn:not(.multi-btn)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const calc = btn.dataset.calc;
      const group = btn.dataset.group;
      const value = btn.dataset.value;

      document.querySelectorAll(`.toggle-btn[data-calc="${calc}"][data-group="${group}"]`).forEach((b) => {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      const calcObj = { c1, c2, c3, c4 }[calc];
      if (calcObj) {
        calcObj.state[group] = value;
        calcObj.update();
      }
    });
  });

  // Multi-select toggle buttons (for future goals in Calc 3)
  document.querySelectorAll('.multi-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const calc = btn.dataset.calc;
      const group = btn.dataset.group;

      const selected = [];
      document.querySelectorAll(`.multi-btn[data-calc="${calc}"][data-group="${group}"].active`).forEach((b) => {
        selected.push(b.dataset.value);
      });

      const calcObj = { c1, c2, c3, c4 }[calc];
      if (calcObj) {
        calcObj.state[group] = selected;
        calcObj.update();
      }
    });
  });

  // =============================================
  // Global: CTA Buttons
  // =============================================

  document.querySelectorAll('.cta-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const calc = btn.dataset.calc;
      const calcObj = { c1, c2, c3, c4 }[calc];
      if (calcObj) calcObj.update();

      btn.style.transform = 'scale(0.98)';
      setTimeout(() => { btn.style.transform = ''; }, 150);

      if (window.innerWidth <= 900) {
        const section = btn.closest('.calculator-section');
        const panel = section.querySelector('.results-panel');
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // =============================================
  // Initialize
  // =============================================

  initAllSliders();
  initSearchableSelects();
  c1.init();
  c2.init();
  c3.init();
  c4.init();
});
