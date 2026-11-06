import express from 'express';
import { finalizeVipInvoice } from '../services/qpayVipService.js';
import { logger } from '../utils/logger.js';

export function createQPayRouter(client) {
  const router = express.Router();

  router.post('/callback', async (req, res) => {
    const invoiceId = String(req.body?.invoice_id || '').trim();
    if (!invoiceId || invoiceId.length > 128) {
      return res.status(400).json({ status: 'invalid_callback' });
    }

    try {
      const result = await finalizeVipInvoice(client, invoiceId);
      if (result.reason === 'invoice_not_found' || result.reason === 'invalid_invoice') {
        return res.status(404).json({ status: result.reason });
      }
      if (result.ok === false) {
        return res.status(503).json({ status: result.reason || 'not_completed' });
      }
      return res.status(200).json({
        status: result.paid || result.alreadyPaid ? 'paid' : result.pending ? 'pending' : 'processing',
      });
    } catch (error) {
      logger.error('QPay callback processing failed', { error: error.message });
      return res.status(503).json({ status: 'verification_failed' });
    }
  });

  return router;
}
