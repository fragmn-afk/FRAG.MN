import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { getFromDb, setInDb } from '../utils/database/wrapper.js';
import { logger } from '../utils/logger.js';
import { fragmnConfig } from '../config/fragmn.js';

const INVOICE_PREFIX = 'fragmn:qpay:invoice:';
const LATEST_PREFIX = 'fragmn:qpay:latest:';
const processingInvoices = new Set();

let cachedToken = null;
let tokenExpiresAt = 0;

function getQPayConfig() {
  const config = {
    baseUrl: (process.env.QPAY_BASE_URL || 'https://merchant-sandbox.qpay.mn').replace(/\/+$/, ''),
    clientId: process.env.QPAY_CLIENT_ID,
    clientSecret: process.env.QPAY_CLIENT_SECRET,
    invoiceCode: process.env.QPAY_INVOICE_CODE,
    callbackUrl: process.env.QPAY_CALLBACK_URL,
  };
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== 'baseUrl' && !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error('QPay тохиргоо дутуу байна: ' + missing.join(', '));
  }
  if (!/^https:\/\//i.test(config.callbackUrl)) {
    throw new Error('QPAY_CALLBACK_URL нь public HTTPS URL байх шаардлагатай.');
  }
  return config;
}

function ensurePersistentDatabase(client) {
  if (!client?.db || typeof client.db.isAvailable !== 'function' || !client.db.isAvailable()) {
    throw new Error('QPay төлбөр үүсгэхийн тулд PostgreSQL холболт шаардлагатай. Memory fallback горимд төлбөр хүлээн авахгүй.');
  }
}

async function getAccessToken() {
  const config = getQPayConfig();
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const basic = Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64');
  const response = await axios.post(config.baseUrl + '/v2/auth/token', {}, {
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/json' },
    timeout: 12_000,
  });
  if (!response.data?.access_token) throw new Error('QPay access token буцаасангүй.');

  cachedToken = response.data.access_token;
  const expiresIn = Number(response.data.expires_in) || 3600;
  tokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000;
  return cachedToken;
}

async function qpayPost(path, body) {
  const config = getQPayConfig();
  const token = await getAccessToken();
  const response = await axios.post(config.baseUrl + path, body, {
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    timeout: 15_000,
  });
  return response.data;
}

function invoiceKey(invoiceId) {
  return INVOICE_PREFIX + invoiceId;
}
function latestKey(guildId, userId) {
  return LATEST_PREFIX + guildId + ':' + userId;
}
function getPackage(tier) {
  const normalizedTier = String(tier || '').toLowerCase();
  const selected = fragmnConfig.vipPackages[normalizedTier];
  if (!selected || !selected.roleId) {
    throw new Error('Энэ VIP багцын Discord role ID тохируулагдаагүй байна.');
  }
  if (!Number.isSafeInteger(selected.price) || selected.price <= 0) {
    throw new Error('VIP багцын үнэ буруу тохируулагдсан байна.');
  }
  return { key: normalizedTier, ...selected };
}

export async function createVipInvoice(client, { guildId, userId, tier }) {
  ensurePersistentDatabase(client);
  const config = getQPayConfig();
  const selected = getPackage(tier);
  const senderInvoiceNo = 'FRAGMN-' + randomUUID().replace(/-/g, '').slice(0, 24);

  const response = await qpayPost('/v2/invoice', {
    invoice_code: config.invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: 'terminal',
    invoice_description: 'FRAG.MN ' + selected.name + ' role - Discord ' + userId,
    amount: selected.price,
    callback_url: config.callbackUrl,
  });
  if (!response?.invoice_id) throw new Error('QPay invoice_id буцаасангүй.');

  const invoice = {
    invoiceId: response.invoice_id,
    senderInvoiceNo,
    guildId,
    userId,
    tier: selected.key,
    tierName: selected.name,
    roleId: selected.roleId,
    amount: selected.price,
    currency: 'MNT',
    status: 'pending',
    paymentConfirmed: false,
    createdAt: new Date().toISOString(),
    qrImage: response.qr_image || response.qrImage || null,
    shortUrl: response.qPay_shortUrl || response.qpay_short_url || null,
    urls: Array.isArray(response.urls) ? response.urls : [],
  };

  const saved = await setInDb(invoiceKey(invoice.invoiceId), invoice);
  if (!saved) {
    try {
      await qpayPost('/v2/invoice/cancel', { invoice_id: invoice.invoiceId });
    } catch (cancelError) {
      logger.warn('Could not cancel untracked QPay invoice', { invoiceId: invoice.invoiceId, error: cancelError.message });
    }
    throw new Error('Төлбөрийн нэхэмжлэхийг database-д хадгалж чадсангүй.');
  }

  await setInDb(latestKey(guildId, userId), invoice.invoiceId);
  logger.info('FRAG.MN QPay invoice created', {
    invoiceId: invoice.invoiceId, guildId, userId, tier: invoice.tier, amount: invoice.amount,
  });
  return invoice;
}

async function confirmPayment(invoice) {
  const result = await qpayPost('/v2/payment/check', {
    object_type: 'INVOICE',
    object_id: invoice.invoiceId,
    offset: { page_number: 1, page_limit: 50 },
  });
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const paidRows = rows.filter((row) => {
    const status = String(row.payment_status || row.status || '').toUpperCase();
    return !status || status === 'PAID' || status === 'SUCCESS';
  });
  const paidAmount = Number(result.paid_amount) ||
    paidRows.reduce((sum, row) => sum + (Number(row.payment_amount) || 0), 0);
  const currenciesValid = paidRows.every((row) =>
    !row.payment_currency || String(row.payment_currency).toUpperCase() === 'MNT',
  );
  return {
    paid: Number(result.count) > 0 && paidRows.length > 0 && paidAmount >= invoice.amount && currenciesValid,
    paidAmount,
    paymentIds: paidRows.map((row) => row.payment_id).filter(Boolean),
  };
}

export async function finalizeVipInvoice(client, invoiceId) {
  ensurePersistentDatabase(client);
  const id = String(invoiceId || '').trim();
  if (!id || id.length > 128) return { ok: false, reason: 'invalid_invoice' };
  if (processingInvoices.has(id)) return { ok: true, inProgress: true };

  const invoice = await getFromDb(invoiceKey(id), null);
  if (!invoice) return { ok: false, reason: 'invoice_not_found' };
  if (invoice.status === 'paid') return { ok: true, alreadyPaid: true, invoice };

  processingInvoices.add(id);
  try {
    if (!invoice.paymentConfirmed) {
      const verification = await confirmPayment(invoice);
      if (!verification.paid) return { ok: true, pending: true, invoice };

      invoice.paymentConfirmed = true;
      invoice.paymentConfirmedAt = new Date().toISOString();
      invoice.paymentIds = verification.paymentIds;
      invoice.paidAmount = verification.paidAmount;
      invoice.status = 'role_pending';
      await setInDb(invoiceKey(id), invoice);
    }

    const guild = client.guilds.cache.get(invoice.guildId) ||
      await client.guilds.fetch(invoice.guildId).catch(() => null);
    if (!guild) {
      invoice.lastRoleError = 'Discord server not found by bot';
      await setInDb(invoiceKey(id), invoice);
      return { ok: false, reason: 'guild_unavailable', invoice };
    }

    const [member, role] = await Promise.all([
      guild.members.fetch(invoice.userId).catch(() => null),
      guild.roles.fetch(invoice.roleId).catch(() => null),
    ]);
    if (!member || !role) {
      invoice.lastRoleError = !member ? 'Discord member is no longer in the server' : 'Configured VIP role not found';
      await setInDb(invoiceKey(id), invoice);
      return { ok: false, reason: 'role_target_unavailable', invoice };
    }

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, 'FRAG.MN QPay invoice ' + id + ' confirmed');
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
    invoice.roleAssignedAt = new Date().toISOString();
    invoice.lastRoleError = null;
    await setInDb(invoiceKey(id), invoice);
    logger.info('FRAG.MN VIP role assigned after QPay verification', {
      invoiceId: id, guildId: invoice.guildId, userId: invoice.userId, tier: invoice.tier, roleId: invoice.roleId,
    });
    return { ok: true, paid: true, invoice };
  } catch (error) {
    logger.error('Failed to finalize FRAG.MN QPay invoice', { invoiceId: id, error: error.message });
    throw error;
  } finally {
    processingInvoices.delete(id);
  }
}

export async function getVipInvoiceForUser(client, { guildId, userId, invoiceId = null }) {
  ensurePersistentDatabase(client);
  const selectedId = invoiceId || await getFromDb(latestKey(guildId, userId), null);
  if (!selectedId) return null;
  const invoice = await getFromDb(invoiceKey(selectedId), null);
  if (!invoice || invoice.guildId !== guildId || invoice.userId !== userId) return null;
  return invoice;
}
