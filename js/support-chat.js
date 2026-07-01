/* Riot Shop — AI support chatbot (site-scoped) */

const SUPPORT_CHAT = {
  agentName: 'Riot Shop AI',
  agentLabel: 'Online now',
  welcomeDelay: 700,
  typingMin: 500,
  typingMax: 2200,
  closeDuration: 320,
};

const OFF_TOPIC_REPLY =
  'I can only help with general Riot Shop questions — products, delivery, pricing, safety, and checkout. For personal order help, use the Reach Us page.';

const chatState = {
  history: [],
  lastIntent: null,
  lastReply: '',
};

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s$%#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isTrustQuestion(text) {
  const trustPatterns = [
    'scam', 'legit', 'legitimate', 'fake', 'sketchy', 'sketch', 'fraud', 'ripoff', 'rip off',
    'trustworthy', 'can i trust', 'is this real', 'are you real', 'is riot shop real',
    'is this safe', 'is it safe', 'too good to be true', 'steal', 'suspicious', 'shady', 'dodgy',
    'is this legit', 'not a scam', 'actually legit', 'worried', 'nervous',
  ];
  return includesAny(text, trustPatterns)
    || /^(is this|are you|this|riot shop)?\s*(a\s+)?(scam|fake|legit|real|safe)\??$/.test(text);
}

function isPersonalQuestion(text) {
  const personalPatterns = [
    'my order', 'track my', 'where is my', 'status of my', 'my account order',
    'my vp order', 'my code', 'wrong email on my', 'change my email', 'my payment',
    'still waiting on my', 'not received my', 'refund my order', 'cancel my order',
  ];
  return includesAny(text, personalPatterns);
}

function isAcknowledgment(text) {
  return /^(ok|okay|cool|got it|gotcha|k|nice|sounds good|perfect|great|alright|bet|ty|thanks|thank you|thx|appreciate it|that helps|makes sense|understood)\.?!?$/i.test(text);
}

function isGreeting(text) {
  return includesAny(text, ['hello', 'hi ', 'hey', 'howdy', 'good morning', 'good afternoon', 'sup', 'yo '])
    || /^(hi|hey|hello|yo|sup)\??$/.test(text);
}

function isFarewell(text) {
  return includesAny(text, ['bye', 'goodbye', 'see you', 'later', 'gotta go']);
}

function formatVpBundles() {
  return VP_BUNDLES.map((b) => `${b.amount} — ${formatPrice(b.price)}`).join('\n• ');
}

function buildTrustReply() {
  return [
    'No — Riot Shop is not a scam. We are an independent Valorant shop with 5,000+ completed orders and a 4.9 average rating.',
    'Why buyers trust us:',
    '• Transparent pricing before checkout',
    '• Instant delivery after payment confirmation',
    '• Full refund guarantee if something goes wrong',
    '• Lifetime warranty on accounts',
    '• Preview links on every account listing',
    '',
    'Still unsure? Read reviews on the homepage or check /faq.',
  ].join('\n');
}

function buildDeliveryReply() {
  return [
    'Delivery is instant after payment confirmation.',
    '• Valorant Points → gift card code to your email',
    '• Accounts → full login details to your email',
    '• Gun buddy / unban → handled with your Riot ID after payment',
    '',
    'Most buyers receive orders within 10–15 minutes.',
  ].join('\n');
}

function buildVpReply() {
  return [
    'Valorant Points bundles:',
    `• ${formatVpBundles()}`,
    '',
    'Select a bundle on /valorant-points, checkout, and redeem the gift card code in-game.',
    'Prices are well below official in-game store rates.',
  ].join('\n');
}

function buildAccountsReply() {
  return [
    'We sell full-access Valorant accounts in 5 regions: North America, Europe, Latin America, Asia/Pacific, and Korea.',
    'Every listing includes:',
    '• Preview before you buy',
    '• Full access + original email',
    '• Lifetime warranty',
    '',
    'Browse at /accounts and use Preview to check skins and rank.',
  ].join('\n');
}

function buildPaymentReply() {
  return 'Checkout supports PayPal, card, bank transfer, and crypto. Pick your method on the payment page after selecting a product. Delivery starts as soon as payment clears.';
}

function buildRefundReply() {
  return 'If anything goes wrong with your order, contact us through /reach-us. We will make it right or issue a full refund. Accounts also include a lifetime warranty.';
}

function buildBanReply() {
  return 'Buying Valorant Points or accounts through Riot Shop does not put you at ban risk. Valorant Points are delivered as standard gift card codes you redeem yourself.';
}

function buildDiscountReply() {
  const code = RIOT_SHOP.discountCode || 'RIOT50';
  return [
    `Use code ${code} for 50% off your first order.`,
    'At checkout (step 1 — Select payment method), enter the code in the Discount code box and click Apply.',
    'Your total updates immediately — voucher amount and crypto price both use the discounted total.',
    'Copy the code from the welcome popup on site, or type RIOT50 manually.',
  ].join('\n');
}

function buildServicesReply(text) {
  if (includesAny(text, ['unban', 'banned', 'ban appeal'])) {
    return 'Unban Service is $99.99. Provide your Riot ID and email at checkout — no login password needed. Order from /products or the homepage.';
  }
  return 'Riot Gun Buddy Service is $49.99. We add the buddy to your account using only your Riot ID and email — no login required. Order from /products.';
}

function buildProcessReply() {
  return [
    'How to order:',
    '1. Pick Valorant Points, an account, or a service',
    '2. Complete secure checkout',
    '3. Receive delivery by email after payment clears',
    '',
    'Start at /products or /valorant-points.',
  ].join('\n');
}

function buildContactReply() {
  return `For order-specific help, use ${RIOT_SHOP.supportPath || '/reach-us'} and include your product and delivery email. I can answer general site questions here anytime.`;
}

function scoreIntent(text, rules) {
  let score = 0;
  for (const keyword of rules.keywords || []) {
    if (text.includes(keyword)) score += 2;
  }
  for (const pattern of rules.patterns || []) {
    if (pattern.test(text)) score += 3;
  }
  if (rules.custom) score += rules.custom(text) || 0;
  return Math.max(0, score);
}

const INTENTS = [
  {
    id: 'trust',
    keywords: ['scam', 'legit', 'fake', 'sketchy', 'fraud', 'trust', 'safe', 'real', 'shady'],
    custom: (text) => (isTrustQuestion(text) ? 12 : 0),
    reply: () => buildTrustReply(),
  },
  {
    id: 'personal',
    custom: (text) => (isPersonalQuestion(text) ? 20 : 0),
    reply: () => OFF_TOPIC_REPLY,
  },
  {
    id: 'greeting',
    custom: (text) => (isGreeting(text) ? 8 : 0),
    reply: () => pickRandom([
      "Hey! I'm Riot Shop AI — ask about Valorant Points, accounts, delivery, or whether we're legit.",
      'Hi! I can help with products, pricing, checkout, and delivery on Riot Shop.',
      'Hey there! Ask me anything about Valorant Points, accounts, or how ordering works.',
    ]),
  },
  {
    id: 'farewell',
    custom: (text) => (isFarewell(text) ? 8 : 0),
    reply: () => pickRandom([
      'Good luck in your games! Shop anytime at /valorant-points.',
      'Take care — we are here if you need anything else.',
      'See you! Instant delivery after checkout whenever you are ready.',
    ]),
  },
  {
    id: 'thanks',
    keywords: ['thank', 'thanks', 'thx', 'appreciate', 'helpful'],
    reply: () => pickRandom([
      'You are welcome! Let me know if anything else comes up.',
      'Glad I could help — happy shopping.',
      'Anytime! Good luck with your order.',
    ]),
  },
  {
    id: 'discount',
    keywords: ['discount', 'coupon', 'promo', 'code', 'riot50', '50%', '50 percent', 'first order', 'offer'],
    reply: () => buildDiscountReply(),
  },
  {
    id: 'delivery',
    keywords: ['delivery', 'how fast', 'how long', 'when', 'instant', 'email', 'arrive', 'wait', 'speed'],
    patterns: [/\bhow long\b/, /\bhow fast\b/],
    reply: () => buildDeliveryReply(),
  },
  {
    id: 'vp',
    keywords: ['valorant points', 'vp', 'points', 'bundle', 'gift card', 'redeem', '5350', '11000', '22000', '49350'],
    custom: (text) => (text.includes('point') || text.includes(' vp') || text === 'vp' ? 4 : 0),
    reply: () => buildVpReply(),
  },
  {
    id: 'accounts',
    keywords: ['account', 'accounts', 'skin', 'preview', 'full access', 'warranty', 'region', 'smurf', 'ranked'],
    reply: () => buildAccountsReply(),
  },
  {
    id: 'payment',
    keywords: ['payment', 'paypal', 'crypto', 'card', 'bank', 'checkout', 'pay with'],
    reply: () => buildPaymentReply(),
  },
  {
    id: 'refund',
    keywords: ['refund', 'money back', 'wrong order', 'problem', 'issue', 'warranty'],
    reply: () => buildRefundReply(),
  },
  {
    id: 'ban',
    keywords: ['ban', 'banned', 'ban risk', 'get banned', 'suspend'],
    exclude: ['unban'],
    reply: () => buildBanReply(),
  },
  {
    id: 'services',
    keywords: ['gun buddy', 'buddy', 'unban', 'unban service', 'service'],
    reply: (text) => buildServicesReply(text),
  },
  {
    id: 'process',
    keywords: ['how does', 'how do i', 'how to', 'process', 'steps', 'order', 'buy', 'work'],
    reply: () => buildProcessReply(),
  },
  {
    id: 'contact',
    keywords: ['contact', 'support', 'reach', 'human', 'help me', 'talk to', 'customer service'],
    reply: () => buildContactReply(),
  },
  {
    id: 'about',
    keywords: ['what is riot shop', 'about', 'who are you', 'riot shop'],
    reply: () => [
      'Riot Shop sells Valorant Points, full-access accounts, gun buddy service, and unban help.',
      '5,000+ orders completed, instant delivery after payment, and support through /reach-us.',
      'We are not affiliated with Riot Games.',
    ].join('\n'),
  },
  {
    id: 'off_topic',
    keywords: ['weather', 'joke', 'homework', 'recipe', 'movie', 'song'],
    reply: () => 'I can only answer questions about Riot Shop. Try asking if we are legit, how delivery works, or what Valorant Points bundles cost.',
  },
];

function matchIntents(text) {
  return INTENTS
    .map((intent) => ({ intent, score: scoreIntent(text, intent) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function generateSupportReply(message) {
  const raw = String(message).trim();
  const text = normalizeText(raw);

  if (!text) {
    return 'Ask me about Valorant Points, accounts, delivery, pricing, or whether Riot Shop is legit.';
  }

  chatState.history.push({ role: 'user', text: raw });
  if (chatState.history.length > 8) chatState.history.shift();

  if (isAcknowledgment(text)) {
    const reply = pickRandom([
      'Glad I could help! Let me know if you need anything else.',
      'Anytime — good luck with your order.',
    ]);
    chatState.lastReply = reply;
    return reply;
  }

  const matches = matchIntents(text);
  if (matches.length === 0) {
    const reply = [
      "I didn't quite catch that.",
      'Try asking:',
      '• "Is Riot Shop legit?"',
      '• "How fast is delivery?"',
      '• "What Valorant Points bundles do you have?"',
      '• "How do I use RIOT50?"',
    ].join('\n');
    chatState.lastReply = reply;
    return reply;
  }

  const reply = matches[0].intent.reply(text);
  chatState.lastIntent = matches[0].intent.id;
  chatState.lastReply = reply;
  chatState.history.push({ role: 'agent', text: reply });
  return reply;
}

function getTypingDelay(text) {
  const words = String(text).split(/\s+/).length;
  const base = SUPPORT_CHAT.typingMin + Math.min(words * 40, 800);
  const jitter = Math.random() * (SUPPORT_CHAT.typingMax - SUPPORT_CHAT.typingMin);
  return base + jitter * 0.5;
}

function escapeChatHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function getSupportChatHtml() {
  return `
    <div id="support-chat-root" class="support-chat-root" aria-live="polite">
      <button
        type="button"
        id="support-chat-toggle"
        class="support-chat-toggle"
        aria-expanded="false"
        aria-controls="support-chat-panel"
        aria-label="Open support chat"
      >
        <svg class="support-chat-toggle-icon support-chat-toggle-icon--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
        <svg class="support-chat-toggle-icon support-chat-toggle-icon--close hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span class="support-chat-toggle-pulse" aria-hidden="true"></span>
      </button>

      <div id="support-chat-panel" class="support-chat-panel" role="dialog" aria-label="Riot Shop AI chat" aria-hidden="true">
        <div class="support-chat-header">
          <div class="support-chat-header-info">
            <div class="support-chat-avatar support-chat-avatar--ai" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2 2 0 01-2 2H7a2 2 0 01-2-2v-2.5"/>
              </svg>
            </div>
            <div>
              <p class="support-chat-agent">${SUPPORT_CHAT.agentName}</p>
              <p class="support-chat-status"><span class="support-chat-online-dot" aria-hidden="true"></span> ${SUPPORT_CHAT.agentLabel}</p>
            </div>
          </div>
          <button type="button" id="support-chat-close" class="support-chat-close" aria-label="Close chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div id="support-chat-messages" class="support-chat-messages" role="log" aria-relevant="additions"></div>

        <form id="support-chat-form" class="support-chat-form">
          <input
            type="text"
            id="support-chat-input"
            class="support-chat-input"
            placeholder="Ask Riot Shop AI..."
            autocomplete="off"
            maxlength="500"
            aria-label="Message"
          >
          <button type="submit" class="support-chat-send" aria-label="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  `;
}

function appendChatMessage(container, { text, sender, isTyping = false }) {
  const row = document.createElement('div');
  row.className = `support-chat-message support-chat-message--${sender}${isTyping ? ' support-chat-message--typing' : ''}`;

  if (isTyping) {
    row.innerHTML = `
      <div class="support-chat-bubble support-chat-bubble--agent support-chat-bubble--typing">
        <span class="support-chat-typing" aria-label="Riot Shop AI is typing">
          <span></span><span></span><span></span>
        </span>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="support-chat-bubble support-chat-bubble--${sender === 'user' ? 'user' : 'agent'}">${escapeChatHtml(text)}</div>
    `;
  }

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
  return row;
}

let chatAnimating = false;

function updateChatToggleUi(isOpen) {
  const toggle = document.getElementById('support-chat-toggle');
  if (!toggle) return;

  const iconOpen = toggle.querySelector('.support-chat-toggle-icon--open');
  const iconClose = toggle.querySelector('.support-chat-toggle-icon--close');
  const pulse = toggle.querySelector('.support-chat-toggle-pulse');

  toggle.classList.toggle('support-chat-toggle--active', isOpen);
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.setAttribute('aria-label', isOpen ? 'Close support chat' : 'Open support chat');
  iconOpen?.classList.toggle('hidden', isOpen);
  iconClose?.classList.toggle('hidden', !isOpen);
  pulse?.classList.toggle('hidden', isOpen);
}

function setChatOpen(isOpen) {
  const panel = document.getElementById('support-chat-panel');
  if (!panel || chatAnimating) return;

  const isCurrentlyOpen = panel.classList.contains('support-chat-panel--open');
  if (isOpen === isCurrentlyOpen) return;

  if (isOpen) {
    panel.classList.remove('support-chat-panel--closing');
    panel.setAttribute('aria-hidden', 'false');
    updateChatToggleUi(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => panel.classList.add('support-chat-panel--open'));
    });
    setTimeout(() => document.getElementById('support-chat-input')?.focus(), 360);
    return;
  }

  chatAnimating = true;
  updateChatToggleUi(false);
  panel.classList.remove('support-chat-panel--open');
  panel.classList.add('support-chat-panel--closing');

  let finished = false;
  const finishClose = () => {
    if (finished) return;
    finished = true;
    panel.classList.remove('support-chat-panel--closing');
    panel.setAttribute('aria-hidden', 'true');
    chatAnimating = false;
  };

  const onEnd = (event) => {
    if (event.target !== panel || event.propertyName !== 'opacity') return;
    panel.removeEventListener('transitionend', onEnd);
    finishClose();
  };

  panel.addEventListener('transitionend', onEnd);
  setTimeout(finishClose, SUPPORT_CHAT.closeDuration + 100);
}

function initSupportChat() {
  if (document.getElementById('support-chat-root')) return;

  document.body.insertAdjacentHTML('beforeend', getSupportChatHtml());

  const root = document.getElementById('support-chat-root');
  const toggle = document.getElementById('support-chat-toggle');
  const closeBtn = document.getElementById('support-chat-close');
  const panel = document.getElementById('support-chat-panel');
  const messages = document.getElementById('support-chat-messages');
  const form = document.getElementById('support-chat-form');
  const input = document.getElementById('support-chat-input');

  let welcomed = false;
  let responding = false;

  const isOpen = () => panel.classList.contains('support-chat-panel--open');

  const sendAgentReply = (text) => {
    const typingRow = appendChatMessage(messages, { sender: 'agent', isTyping: true });

    setTimeout(() => {
      typingRow.remove();
      appendChatMessage(messages, { sender: 'agent', text });
      responding = false;
      input.disabled = false;
      if (isOpen()) input.focus();
    }, getTypingDelay(text));
  };

  const handleUserMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed || responding) return;

    appendChatMessage(messages, { sender: 'user', text: trimmed });
    input.value = '';
    input.disabled = true;
    responding = true;
    sendAgentReply(generateSupportReply(trimmed));
  };

  const maybeWelcome = () => {
    if (welcomed) return;
    welcomed = true;
    setTimeout(() => {
      sendAgentReply(
        "Hi! I'm Riot Shop AI — ask me if we're legit, how delivery works, Valorant Points pricing, or how to use code RIOT50."
      );
    }, SUPPORT_CHAT.welcomeDelay);
  };

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !isOpen();
    setChatOpen(willOpen);
    if (willOpen) maybeWelcome();
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setChatOpen(false);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(input.value);
  });

  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (root?.contains(e.target)) return;
    setChatOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setChatOpen(false);
  });
}