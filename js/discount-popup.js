/* Riot Shop — first-order discount popup */

const DISCOUNT_POPUP = {
  code: 'RIOT50',
  label: '50% off your first order',
  delayMs: 15000,
  dismissedKey: 'riotshop_discount_dismissed',
};

function hasPurchaseIntent() {
  try {
    return sessionStorage.getItem(PURCHASE_INTENT_KEY) === '1';
  } catch {
    return false;
  }
}

function isDiscountDismissed() {
  try {
    return localStorage.getItem(DISCOUNT_POPUP.dismissedKey) === '1';
  } catch {
    return false;
  }
}

function shouldShowDiscountPopup() {
  const page = document.body?.dataset?.page;
  if (page === 'payment') return false;
  if (hasPurchaseIntent()) return false;
  if (isDiscountDismissed()) return false;
  return true;
}

function markDiscountDismissed() {
  try {
    localStorage.setItem(DISCOUNT_POPUP.dismissedKey, '1');
  } catch {
    /* ignore */
  }
}

function getDiscountPopupHtml() {
  return `
    <div id="discount-popup-root" class="discount-popup-root" aria-hidden="true">
      <button type="button" class="discount-popup-backdrop" aria-label="Close offer"></button>
      <div
        id="discount-popup-dialog"
        class="discount-popup-dialog glass-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-popup-title"
      >
        <button type="button" id="discount-popup-close" class="discount-popup-close" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <p class="discount-popup-eyebrow">First order offer</p>
        <h2 id="discount-popup-title" class="discount-popup-title">${DISCOUNT_POPUP.label}</h2>
        <p class="discount-popup-text">At checkout, enter this code in the Discount code field (step 1) and click Apply for 50% off.</p>
        <div class="discount-popup-code-row">
          <span class="discount-popup-code" id="discount-popup-code">${DISCOUNT_POPUP.code}</span>
          <button type="button" id="discount-popup-copy" class="btn-secondary discount-popup-copy-btn">Copy code</button>
        </div>
        <a href="/valorant-points" class="btn-primary w-full py-3.5 discount-popup-cta">Shop Valorant Points</a>
        <button type="button" id="discount-popup-dismiss" class="discount-popup-dismiss">No thanks</button>
      </div>
    </div>
  `;
}

function setDiscountPopupOpen(isOpen) {
  const root = document.getElementById('discount-popup-root');
  if (!root) return;

  root.classList.toggle('discount-popup-root--open', isOpen);
  root.setAttribute('aria-hidden', String(!isOpen));
  document.body.classList.toggle('discount-popup-open', isOpen);

  if (isOpen) {
    document.getElementById('discount-popup-copy')?.focus();
  }
}

function bindPurchaseIntentListeners() {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (
      target.closest('.btn-buy, .product-buy-btn, [data-buy-type], a[href*="/payment"]')
    ) {
      markPurchaseIntent();
    }
  });
}

function initDiscountPopup() {
  if (document.getElementById('discount-popup-root')) return;
  if (!shouldShowDiscountPopup()) return;

  document.body.insertAdjacentHTML('beforeend', getDiscountPopupHtml());

  const root = document.getElementById('discount-popup-root');
  const closeBtn = document.getElementById('discount-popup-close');
  const dismissBtn = document.getElementById('discount-popup-dismiss');
  const backdrop = root?.querySelector('.discount-popup-backdrop');
  const copyBtn = document.getElementById('discount-popup-copy');
  const cta = root?.querySelector('.discount-popup-cta');

  let shown = false;
  let timerId = null;

  const closePopup = (dismissPermanent = true) => {
    if (dismissPermanent) markDiscountDismissed();
    setDiscountPopupOpen(false);
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const tryShow = () => {
    if (shown || !shouldShowDiscountPopup()) return;
    shown = true;
    setDiscountPopupOpen(true);
  };

  timerId = window.setTimeout(tryShow, DISCOUNT_POPUP.delayMs);

  closeBtn?.addEventListener('click', () => closePopup(true));
  dismissBtn?.addEventListener('click', () => closePopup(true));
  backdrop?.addEventListener('click', () => closePopup(true));

  const stashDiscountForCheckout = () => {
    try {
      sessionStorage.setItem('riotshop_pending_discount', DISCOUNT_POPUP.code);
    } catch {
      /* ignore */
    }
  };

  copyBtn?.addEventListener('click', async () => {
    stashDiscountForCheckout();
    try {
      await navigator.clipboard.writeText(DISCOUNT_POPUP.code);
      showToast(`Copied ${DISCOUNT_POPUP.code} — apply at checkout`);
    } catch {
      showToast(`${DISCOUNT_POPUP.code} — apply at checkout`);
    }
  });

  cta?.addEventListener('click', () => {
    stashDiscountForCheckout();
    markPurchaseIntent();
    closePopup(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root?.classList.contains('discount-popup-root--open')) {
      closePopup(true);
    }
  });

  bindPurchaseIntentListeners();
}