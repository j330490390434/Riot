const MAX_CODE_ATTEMPTS = 10;

const PENDING_DISCOUNT_KEY = 'riotshop_pending_discount';

const DISCOUNT_CODES = {
  RIOT50: {
    percent: 50,
    label: '50% off your first order',
    usedKey: 'riotshop_riot50_used',
  },
};

function normalizeDiscountCode(code) {
  return String(code).trim().toUpperCase().replace(/\s+/g, '');
}

function isDiscountCodeUsed(usedKey) {
  try {
    return localStorage.getItem(usedKey) === '1';
  } catch {
    return false;
  }
}

function markDiscountCodeUsed(usedKey) {
  try {
    localStorage.setItem(usedKey, '1');
  } catch {
    /* ignore */
  }
}

function validateDiscountCode(code) {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) {
    return { valid: false, error: 'Enter a discount code.' };
  }

  const config = DISCOUNT_CODES[normalized];
  if (!config) {
    return { valid: false, error: 'Invalid discount code.' };
  }

  if (isDiscountCodeUsed(config.usedKey)) {
    return { valid: false, error: 'This code has already been used on this device.' };
  }

  return { valid: true, code: normalized, config };
}

function applyDiscountToPrice(originalPrice, percent) {
  const discounted = Number(originalPrice) * (1 - percent / 100);
  return Math.max(0.01, Math.round(discounted * 100) / 100);
}

function syncOrderPrice(order, state) {
  const base = Number(order.originalPrice ?? order.price);
  order.originalPrice = base;

  if (state.discountApplied && state.discountCode) {
    const validation = validateDiscountCode(state.discountCode);
    if (validation.valid) {
      order.price = applyDiscountToPrice(base, validation.config.percent);
      return;
    }
    state.discountApplied = false;
    state.discountCode = '';
  }

  order.price = base;
}

function getPendingDiscountCode() {
  try {
    return sessionStorage.getItem(PENDING_DISCOUNT_KEY) || '';
  } catch {
    return '';
  }
}

function clearPendingDiscountCode() {
  try {
    sessionStorage.removeItem(PENDING_DISCOUNT_KEY);
  } catch {
    /* ignore */
  }
}

const PAYMENT_METHODS = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'cashapp', label: 'CashApp' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'credit', label: 'Credit Card' },
  { id: 'debit', label: 'Debit Card' },
  { id: 'apple', label: 'Apple Pay' },
  { id: 'google', label: 'Google Pay' },
  { id: 'bank', label: 'Bank Transfer' },
  { id: 'crypto', label: 'Crypto' },
];

const CRYPTO_COINS = [
  { id: 'btc', label: 'Bitcoin', symbol: 'BTC', geckoId: 'bitcoin', decimals: 8, address: 'bc1qpvjlqm84hft40myteqvdkvv2y04c3scxs3kv8z' },
  { id: 'ltc', label: 'Litecoin', symbol: 'LTC', geckoId: 'litecoin', decimals: 8, address: 'LafDZWerpzJdEmrSwva2XTUojjdEY22DZP' },
  { id: 'eth', label: 'Ethereum', symbol: 'ETH', geckoId: 'ethereum', decimals: 6, address: '0x912F982FbBe0d9e9816005bE8bf4fA8C67cc0CE5' },
  { id: 'sol', label: 'Solana', symbol: 'SOL', geckoId: 'solana', decimals: 6, address: 'JCk77X1YRiot9mi1PgSr6JmgRdpbtvDCVM9yjcAKumr7' },
];

const CRYPTO_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price';

const REWARBLE_VOUCHER_TIERS = [5, 10, 15, 20, 25, 30, 45, 50, 100, 150];

const REWARBLE_VOUCHERS = {
  5: 'https://www.eneba.com/rewarble-rewarble-bank-5-eur-voucher-global',
  10: 'https://www.eneba.com/rewarble-rewarble-venmo-10-usd-voucher-united-states',
  15: 'https://www.eneba.com/rewarble-rewarble-bank-transfer-15-eur-voucher-global',
  20: 'https://www.eneba.com/rewarble-rewarble-venmo-20-usd-voucher-united-states',
  25: 'https://www.eneba.com/rewarble-rewarble-revolut-25-usd-voucher-global',
  30: 'https://www.eneba.com/rewarble-paypal-rewarble-paypal-30-usd-voucher-global',
  45: 'https://www.eneba.com/rewarble-paypal-rewarble-paypal-40-usd-voucher-global',
  50: 'https://www.eneba.com/rewarble-rewarble-venmo-50-usd-voucher-united-states',
  100: 'https://www.eneba.com/rewarble-rewarble-venmo-100-usd-voucher-united-states',
  150: 'https://www.eneba.com/rewarble-rewarble-venmo-150-usd-voucher-united-states',
};

const ALT_REWARBLE_PROVIDERS = [
  { name: 'Skine', url: 'https://skine.com/en-us/rewarble' },
  { name: 'G2A', url: 'https://www.g2a.com/search?query=rewarble%20' },
  { name: 'Kinguin', url: 'https://www.kinguin.net/listing?active=1&hideUnavailable=0&type=kinguin&phrase=&size=50&sort=bestseller.score,DESC' },
  { name: 'SEAGM', url: 'https://www.seagm.com/search?keywords=rewarble' },
  { name: 'CoinGate', url: 'https://coingate.com/gift-cards/rewarble-super' },
];

function orderRequiresRiotId(type) {
  return Boolean(SERVICE_PRODUCTS[type]?.requiresRiotId);
}

function getOrderProductLabel(order) {
  if (order.type === 'vp') return order.label;
  if (order.type === 'account') return `${order.name} (${order.region})`;
  if (SERVICE_PRODUCTS[order.type]) return SERVICE_PRODUCTS[order.type].label;
  return order.label || 'Product';
}

function getVoucherBreakdown(price) {
  const target = Math.ceil(Number(price));
  const tiers = [...REWARBLE_VOUCHER_TIERS].sort((a, b) => b - a);
  const result = [];
  let remaining = target;

  for (const tier of tiers) {
    while (remaining >= tier) {
      result.push(tier);
      remaining -= tier;
    }
  }

  if (remaining > 0) {
    const cover = tiers.filter((t) => t >= remaining).pop() || 5;
    result.push(cover);
  }

  return result.sort((a, b) => b - a);
}

function parseOrderFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  let price = Number(params.get('price'));

  if (!type) return null;

  if (SERVICE_PRODUCTS[type]) {
    price = SERVICE_PRODUCTS[type].price;
  }

  if (!Number.isFinite(price) || price <= 0) return null;

  const order = {
    type,
    price,
    originalPrice: price,
    label: params.get('label') || SERVICE_PRODUCTS[type]?.label || 'Product',
    key: params.get('key') || '',
    region: params.get('region') || '',
    name: params.get('name') || '',
    orderId: params.get('oid') || `ORD-${Date.now().toString(36).toUpperCase()}`,
  };

  if (type === 'vp' && !order.key) return null;
  if (type === 'account' && (!order.region || !order.name)) return null;

  return order;
}

async function fetchCryptoRates() {
  const ids = CRYPTO_COINS.map((c) => c.geckoId).join(',');
  const url = `${CRYPTO_PRICE_API}?ids=${ids}&vs_currencies=usd`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch crypto rates');

  const data = await res.json();
  const rates = {};

  CRYPTO_COINS.forEach((coin) => {
    const usd = data[coin.geckoId]?.usd;
    if (usd) rates[coin.id] = usd;
  });

  if (!Object.keys(rates).length) throw new Error('No crypto rates returned');
  return rates;
}

function calcCryptoAmount(usdPrice, rateUsd, decimals) {
  if (!rateUsd || rateUsd <= 0) return null;
  const amount = usdPrice / rateUsd;
  return amount.toFixed(decimals);
}