function formatPrice(n) {
  return `$${n.toFixed(2)}`;
}

function getPaymentLink(type, key) {
  if (type === 'vp') return PAYMENT_LINKS.vp[key] || '#';
  return PAYMENT_LINKS.account;
}

function showToast(msg, duration = 3200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

const PURCHASE_INTENT_KEY = 'riotshop_purchase_intent';

function markPurchaseIntent() {
  try {
    sessionStorage.setItem(PURCHASE_INTENT_KEY, '1');
  } catch {
    /* ignore */
  }
}

function handleBuy(e) {
  markPurchaseIntent();
  const btn = e.currentTarget;
  const type = btn.dataset.buyType;
  if (!type) return;

  const params = new URLSearchParams({ type });

  if (type === 'vp') {
    params.set('price', btn.dataset.buyPrice || '');
    params.set('key', btn.dataset.buyKey || '');
    params.set('label', btn.dataset.buyLabel || '');
  } else if (type === 'account') {
    params.set('price', btn.dataset.buyPrice || '');
    params.set('region', btn.dataset.buyRegion || '');
    params.set('name', btn.dataset.buyName || '');
  } else if (SERVICE_PRODUCTS[type]) {
    params.set('price', String(SERVICE_PRODUCTS[type].price));
    params.set('label', SERVICE_PRODUCTS[type].label);
  }

  window.location.href = `/payment?${params.toString()}`;
}

const NAV_ITEMS = [
  { href: '/', label: 'Home', id: 'home' },
  { href: '/products', label: 'Available Products', id: 'products' },
  { href: '/reviews', label: 'Reviews', id: 'reviews' },
  { href: '/faq', label: 'FAQ', id: 'faq' },
  { href: '/reach-us', label: 'Reach Us', id: 'reach' },
];

const PRODUCT_CATALOG = [
  {
    id: 'vp',
    title: 'Valorant Points',
    price: 'From $9.99',
    description: 'Valorant Points bundles delivered as a gift card code to your email. Redeem in-game and start spending right away.',
    badge: 'Gift card delivery',
    href: '/valorant-points',
    cta: 'View Valorant Points',
    type: 'link',
  },
  {
    id: 'accounts',
    title: 'Valorant Accounts',
    price: 'Multiple regions',
    description: 'Full access accounts with the original email and lifetime warranty. Preview listings before you buy.',
    badge: 'Full access',
    href: '/accounts',
    cta: 'View Accounts',
    type: 'link',
  },
  {
    id: 'gun-buddy',
    title: 'Riot Gun Buddy Service',
    price: '$49.99',
    description: 'We add a Riot Gun Buddy to your account. Fast delivery with no login info required. Only your Riot ID and email.',
    badge: 'No login required',
    buyType: 'gun-buddy',
    buyPrice: '49.99',
    cta: 'Buy Now',
    type: 'buy',
  },
  {
    id: 'unban',
    title: 'Unban Service',
    price: '$99.99',
    description: 'Professional unban assistance for your Riot account. Fast delivery with no login info required. Only your Riot ID and email.',
    badge: 'No login required',
    buyType: 'unban',
    buyPrice: '99.99',
    cta: 'Buy Now',
    type: 'buy',
  },
];

function renderProductCard(product) {
  const action = product.type === 'link'
    ? `<a href="${product.href}" class="shop-card-cta">${product.cta} →</a>`
    : `<button type="button" class="shop-card-cta product-buy-btn" data-buy-type="${product.buyType}" data-buy-price="${product.buyPrice}">${product.cta} →</button>`;

  return `
    <article class="catalog-card glass-card">
      <div class="catalog-card-top">
        <span class="catalog-badge">${product.badge}</span>
        <span class="catalog-price">${product.price}</span>
      </div>
      <h3 class="catalog-title">${product.title}</h3>
      <p class="catalog-desc">${product.description}</p>
      <p class="catalog-delivery-note">Instant delivery after payment confirmation.</p>
      ${action}
    </article>
  `;
}

function getProductsGridHtml({ showBuyButtons = false } = {}) {
  return PRODUCT_CATALOG.map(renderProductCard).join('');
}

function initProductBuyButtons(root = document) {
  root.querySelectorAll('.product-buy-btn').forEach((btn) => {
    btn.addEventListener('click', handleBuy);
  });
}

function navBtnClass(activePage, id) {
  return activePage === id ? 'nav-btn nav-btn-active' : 'nav-btn';
}

function getHeader(activePage = '') {
  const navLinks = NAV_ITEMS.map((item) =>
    `<a href="${item.href}" class="${navBtnClass(activePage, item.id)}"${activePage === item.id ? ' aria-current="page"' : ''}>${item.label}</a>`
  ).join('');

  return `
    <header class="site-header">
      <div class="header-wrap">
        <div class="header-pill">
          <nav class="header-nav" aria-label="Main navigation">${navLinks}</nav>
          <div class="header-actions">
            <button id="mobile-menu-btn" type="button" class="mobile-menu-btn" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">
              <svg id="mobile-menu-icon-open" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              <svg id="mobile-menu-icon-close" class="hidden" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div id="mobile-nav" class="mobile-nav" aria-hidden="true">
        <button type="button" class="mobile-nav-backdrop" tabindex="-1" aria-label="Close menu"></button>
        <div class="mobile-nav-panel">
          <nav class="flex flex-col gap-1" aria-label="Mobile navigation">
            ${NAV_ITEMS.map((item) =>
              `<a href="${item.href}" class="${navBtnClass(activePage, item.id)}">${item.label}</a>`
            ).join('')}
          </nav>
        </div>
      </div>
    </header>
  `;
}

function getPageCta(buttons = ['products'], message = 'Interested in buying? Click the buttons below.') {
  const config = {
    products: { href: '/products', label: 'View Available Products', primary: true },
    vp: { href: '/valorant-points', label: 'Shop Valorant Points', primary: true },
    accounts: { href: '/accounts', label: 'Shop Accounts', primary: false },
    reach: { href: '/reach-us', label: 'Reach Us', primary: true },
  };

  const actions = buttons.map((key) => {
    const item = config[key];
    if (!item) return '';
    const cls = item.primary ? 'btn-primary' : 'btn-secondary';
    return `<a href="${item.href}" class="${cls} px-6 py-3">${item.label}</a>`;
  }).join('');

  return `
    <div class="page-cta-box glass-card scroll-reveal">
      <p class="page-cta-text">${message}</p>
      <div class="page-cta-actions">${actions}</div>
    </div>
  `;
}

function getFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-links-row">
        <a href="/products" class="footer-link">Available Products</a>
        <a href="/reviews" class="footer-link">Reviews</a>
        <a href="/faq" class="footer-link">FAQ</a>
        <a href="/reach-us" class="footer-link">Reach Us</a>
      </div>
      <div class="footer-copy">
        <p>Riot Shop © 2026</p>
        <p>Not affiliated with Riot Games. VALORANT is a trademark of Riot Games, Inc.</p>
      </div>
    </footer>
  `;
}

function getStarDefs() {
  return `
    <svg width="0" height="0" class="pointer-events-none absolute" aria-hidden="true">
      <defs>
        <linearGradient id="brand-stars" x1="22%" y1="6%" x2="78%" y2="94%">
          <stop offset="0%" stop-color="#fecaca"/>
          <stop offset="50%" stop-color="#ff4655"/>
          <stop offset="100%" stop-color="#dc2626"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}

function starIcons() {
  const path = 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';
  return Array(5).fill(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`).join('');
}

function getInitials(name) {
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function statIconSvg(type) {
  const icons = {
    orders: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" stroke-width="1.5"/>',
    rating: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    delivery: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
    regions: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
  };
  const keys = ['orders', 'rating', 'delivery', 'regions'];
  const key = keys[type] || keys[0];
  return `<svg class="w-5 h-5 text-riot-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icons[key]}</svg>`;
}

function formatStatValue(stat, amount) {
  if (stat.format === 'decimal') return amount.toFixed(1);
  const rounded = Math.round(amount);
  return `${stat.prefix}${rounded.toLocaleString('en-US')}${stat.suffix}`;
}

function getStatsBar(inHero = false) {
  const cards = RIOT_SHOP.stats.map((stat, i) => `
    <div class="glass-card stat-card scroll-reveal" style="--reveal-delay:${i * 0.06}s">
      <div class="brand-icon-well" aria-hidden="true">${statIconSvg(i)}</div>
      <p class="stat-value stat-counter"
        data-stat-value="${stat.value}"
        data-stat-prefix="${stat.prefix}"
        data-stat-suffix="${stat.suffix}"
        data-stat-format="${stat.format}">${stat.prefix}0${stat.suffix}</p>
      <p class="stat-label">${stat.label}</p>
    </div>
  `).join('');

  if (inHero) {
    return `<div class="hero-stats-grid hero-stats-grid--4 stats-grid stats-grid--4">${cards}</div>`;
  }

  return `
    <section class="stats-bar section-block">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 stats-bar-inner">
        <div class="stats-grid stats-grid--4">${cards}</div>
      </div>
    </section>
  `;
}

function initStatsCounters(root = document) {
  const counters = root.querySelectorAll('.stat-counter[data-stat-value]');
  if (!counters.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const run = (el) => {
    const target = Number(el.dataset.statValue);
    const stat = {
      value: target,
      prefix: el.dataset.statPrefix || '',
      suffix: el.dataset.statSuffix || '',
      format: el.dataset.statFormat || 'number',
    };
    if (!Number.isFinite(target) || reduced) {
      el.textContent = formatStatValue(stat, target);
      return;
    }
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatStatValue(stat, target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = formatStatValue(stat, target);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.statAnimated === 'true') return;
      entry.target.dataset.statAnimated = 'true';
      run(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  counters.forEach((c) => observer.observe(c));
}

function getProcessSteps() {
  const steps = [
    { n: 1, title: 'Choose Your Product', text: 'Browse Valorant Points, accounts, gun buddy service, or unban service. Preview accounts before you buy.' },
    { n: 2, title: 'Complete Checkout', text: 'Pay through our secure checkout with PayPal, card, bank transfer, or crypto. No extra steps.' },
    { n: 3, title: 'Receive Your Order', text: 'Delivery is instant after payment confirmation. Valorant Points arrive as a gift card code; accounts ship with full login details.' },
  ];

  return `
    <section class="section-block section-alt">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="section-heading">
          <h2 class="scroll-reveal">How It Works</h2>
          <p class="scroll-reveal">Three simple steps from checkout to delivery.</p>
        </div>
        <div class="reviews-grid">
          ${steps.map((s, i) => `
            <div class="glass-card process-step scroll-reveal" style="--reveal-delay:${i * 0.08}s">
              <div class="step-number">${s.n}</div>
              <h3 class="font-semibold text-heading mb-2">${s.title}</h3>
              <p class="text-muted text-sm leading-relaxed">${s.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function getTrustSignals() {
  const items = [
    { icon: iconClipboard(), title: 'Full Access Accounts', text: 'Every account includes full access, the original email, and a lifetime warranty on your purchase.' },
    { icon: iconLock(), title: 'No Ban Risk', text: 'Buying Valorant Points or accounts through Riot Shop does not put you at ban risk. Shop with confidence.' },
    { icon: iconMessage(), title: 'Full Refund Guarantee', text: 'If anything goes wrong with your order, reach out and we will make it right with a full refund.' },
    { icon: iconBolt(), title: 'Instant Delivery', text: 'Delivery is instant after payment confirmation. Valorant Points, accounts, and services are processed immediately once your payment clears.' },
  ];

  return `
    <section class="section-block">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="section-heading">
          <h2 class="scroll-reveal">Why Players Choose Riot Shop</h2>
          <p class="scroll-reveal">Full access accounts, original email included, lifetime warranty, and zero ban risk on every order.</p>
        </div>
        <div class="trust-grid">
          ${items.map((item, i) => `
            <div class="glass-card trust-card scroll-reveal" style="--reveal-delay:${i * 0.06}s">
              <div class="icon-wrap brand-icon-well">${item.icon}</div>
              <h3 class="font-semibold text-heading mb-2">${item.title}</h3>
              <p class="text-muted text-sm leading-relaxed">${item.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function iconBolt() {
  return '<svg class="w-6 h-6 text-riot-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>';
}
function iconLock() {
  return '<svg class="w-6 h-6 text-riot-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
}
function iconMessage() {
  return '<svg class="w-6 h-6 text-riot-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8z"/></svg>';
}
function iconClipboard() {
  return '<svg class="w-6 h-6 text-riot-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" stroke-width="1.5"/></svg>';
}

function renderReviewCard(review) {
  const [region, type] = review.meta.split(' · ');
  return `
    <article class="h-full scroll-reveal">
      <div class="glass-card review-card">
        <svg class="quote-watermark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
          <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
        </svg>
        <div class="review-card-header">
          <div class="review-card-user">
            <div class="review-avatar" aria-hidden="true">${getInitials(review.name)}</div>
            <div class="min-w-0">
              <div class="review-name">${review.name}</div>
              <div class="review-stars" aria-label="5 out of 5 stars">${starIcons()}</div>
            </div>
          </div>
          <span class="review-badge">${type || review.meta}</span>
        </div>
        <p class="review-text">"${review.text}"</p>
        <div class="review-footer">
          <span>${region || review.meta}</span>
          <span>Verified Buyer</span>
        </div>
      </div>
    </article>
  `;
}

function getFeedbackPreview(limit = 6, options = {}) {
  const title = options.title || 'Customer Reviews';
  const subtitle = options.subtitle || 'What buyers say about ordering from Riot Shop.';
  const reviews = REVIEWS.slice(0, limit).map(renderReviewCard).join('');
  return `
    <section class="section-block section-alt">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        ${getStarDefs()}
        <div class="section-heading">
          <h2 class="scroll-reveal">${title}</h2>
          <p class="scroll-reveal">${subtitle}</p>
        </div>
        <div class="reviews-grid">${reviews}</div>
        <div class="text-center mt-8">
          <a href="/reviews" class="link-arrow">
            View all reviews
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>
  `;
}

function renderFAQList(container) {
  if (!container) return;
  container.innerHTML = FAQ_ITEMS.map((item) => `
    <div class="glass-card faq-item">
      <button class="faq-question" aria-expanded="false">
        ${item.q}
        <svg class="faq-icon w-5 h-5 text-riot-red transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      <div class="faq-answer">
        <p>${item.a}</p>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const icon = btn.querySelector('.faq-icon');
      const open = item.classList.toggle('faq-item-open');
      btn.setAttribute('aria-expanded', open);
      answer.classList.toggle('open', open);
      icon.style.transform = open ? 'rotate(180deg)' : '';
      container.querySelectorAll('.faq-item').forEach((other) => {
        if (other === item) return;
        other.classList.remove('faq-item-open');
        other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-answer').classList.remove('open');
        const otherIcon = other.querySelector('.faq-icon');
        if (otherIcon) otherIcon.style.transform = '';
      });
    });
  });
}

let scrollRevealObserver = null;

function initScrollReveal(root = document) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elements = root.querySelectorAll ? root.querySelectorAll('.scroll-reveal:not(.is-visible)') : [];
  if (!elements.length) return;

  if (reduced) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  if (!scrollRevealObserver) {
    scrollRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        scrollRevealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
  }

  elements.forEach((el) => {
    const parent = el.parentElement;
    if (parent) {
      const siblings = [...parent.querySelectorAll(':scope > .scroll-reveal')];
      const index = siblings.indexOf(el);
      if (index >= 0) el.style.setProperty('--reveal-delay', `${index * 0.08}s`);
    }
    scrollRevealObserver.observe(el);
  });
}

function setMobileMenuOpen(isOpen) {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-nav');
  const iconOpen = document.getElementById('mobile-menu-icon-open');
  const iconClose = document.getElementById('mobile-menu-icon-close');
  if (!btn || !menu) return;
  menu.classList.toggle('is-open', isOpen);
  menu.setAttribute('aria-hidden', String(!isOpen));
  btn.setAttribute('aria-expanded', String(isOpen));
  btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  iconOpen?.classList.toggle('hidden', isOpen);
  iconClose?.classList.toggle('hidden', !isOpen);
  document.body.classList.toggle('mobile-menu-body-lock', isOpen);
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-nav');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => setMobileMenuOpen(!menu.classList.contains('is-open')));
  menu.querySelector('.mobile-nav-backdrop')?.addEventListener('click', () => setMobileMenuOpen(false));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMobileMenuOpen(false)));
}

function initPageAnimations() {
  const targets = Array.from(document.querySelectorAll(
    'main > section, main > #stats-bar, main > #process-steps, main > #trust-signals, main > #home-reviews'
  ));
  let i = 0;
  targets.forEach((el) => {
    if (el.classList.contains('page-enter')) return;
    el.classList.add('page-animate');
    el.style.setProperty('--page-enter-delay', `${i * 0.08}s`);
    i += 1;
  });
}

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function getSeoKeywordsForPage(page = '') {
  const keywords = RIOT_SHOP.seoKeywords;
  const map = {
    home: keywords.global,
    products: keywords.products,
    vp: keywords.valorantPoints,
    accounts: keywords.accounts,
    faq: keywords.faq,
    reviews: keywords.reviews,
    reach: keywords.reachUs,
  };
  return map[page] || keywords.global;
}

function initSeo(page = '') {
  if (typeof window === 'undefined' || typeof RIOT_SHOP === 'undefined') return;

  const origin = RIOT_SHOP.siteUrl;
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const url = canonicalLink?.href || `${origin}${window.location.pathname}`;

  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', RIOT_SHOP.ogImage);
  setMeta('property', 'og:site_name', RIOT_SHOP.siteName);
  setMeta('property', 'og:locale', 'en_US');
  setMeta('name', 'twitter:image', RIOT_SHOP.ogImage);
  setMeta('name', 'keywords', getSeoKeywordsForPage(page));
}

function loadSiteScript(src, dataAttr, onReady) {
  if (document.querySelector(`script[data-${dataAttr}]`)) {
    if (typeof onReady === 'function') onReady();
    return;
  }

  const script = document.createElement('script');
  script.src = src;
  script.dataset[dataAttr] = 'true';
  script.onload = () => {
    if (typeof onReady === 'function') onReady();
  };
  document.body.appendChild(script);
}

function loadSupportChat() {
  const boot = () => {
    if (typeof initSupportChat === 'function') initSupportChat();
  };

  if (typeof initSupportChat === 'function') {
    boot();
    return;
  }

  loadSiteScript('/js/support-chat.js', 'support-chat', boot);
}

function loadDiscountPopup() {
  const page = document.body?.dataset?.page;
  if (page === 'payment') {
    markPurchaseIntent();
    return;
  }

  const boot = () => {
    if (typeof initDiscountPopup === 'function') initDiscountPopup();
  };

  if (typeof initDiscountPopup === 'function') {
    boot();
    return;
  }

  loadSiteScript('/js/discount-popup.js', 'discount-popup', boot);
}

function initLayout(activePage = '') {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');
  if (headerEl) headerEl.innerHTML = getHeader(activePage);
  if (footerEl) footerEl.innerHTML = getFooter();
  initSeo(activePage);
  initMobileMenu();
  initPageAnimations();
  initScrollReveal();
  loadSupportChat();
  loadDiscountPopup();
}

function tailwindScript() {
  return `
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'riot-dark': '#0a0a0a',
              'riot-red': '#ff4655',
              'riot-bg': '#000000',
            },
          },
        },
      };
    <\/script>
  `;
}