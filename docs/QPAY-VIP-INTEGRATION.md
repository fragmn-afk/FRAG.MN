# FRAG.MN QPay VIP Integration

## Payment flow

1. A member runs `/vip plans` and selects a package with `/vip buy`.
2. TitanBot creates a QPay Merchant V2 invoice and returns its QR image and payment links.
3. QPay sends an HTTP POST callback to `/api/qpay/callback`.
4. The callback handler verifies the invoice through QPay's `POST /v2/payment/check` endpoint.
5. The bot grants the configured Discord role only after the verified MNT amount covers the invoice amount.
6. Members can use `/vip status` to see their latest invoice status.

The callback payload is only a notification. It is never trusted as proof of payment by itself.

## Required configuration

Set these variables in the hosting provider's secret/environment settings:

- `QPAY_BASE_URL`: sandbox URL for testing; switch to `https://merchant.qpay.mn` for production.
- `QPAY_CLIENT_ID` and `QPAY_CLIENT_SECRET`: Merchant V2 API credentials.
- `QPAY_INVOICE_CODE`: invoice code issued for the merchant.
- `QPAY_CALLBACK_URL`: publicly accessible HTTPS URL ending in `/api/qpay/callback`.
- `FRAGMN_VIP_ROLE_ID`, `FRAGMN_NOBLE_ROLE_ID`, `FRAGMN_BOSS_ROLE_ID`: Discord role IDs.
- Package prices are configurable with `FRAGMN_VIP_PRICE`, `FRAGMN_NOBLE_PRICE`, and `FRAGMN_BOSS_PRICE`. Defaults are 10,000 / 20,000 / 30,000 MNT.

## Discord permissions

The bot needs **Manage Roles** permission, and its highest role must be above the VIP, NOBLE and BOSS roles.

## Database and deployment

PostgreSQL must be available. New invoices are rejected in in-memory fallback mode because payment records must survive restarts. Deploy the feature branch, configure the environment variables in the hosting provider, and test with QPay sandbox credentials before switching to production.

Never commit API credentials to the repository or paste them into chat. Configure them as hosting secrets.
