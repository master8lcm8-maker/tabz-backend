# R3 PROOF (LOCKED)

Date: 2026-01-20
Branch: m37-from-m36-final
Lock tag: R3_LOCK_2026-01-20

What is proven in PROD:
- drink_orders table exists
- POST /drinks/orders returns 201 when wallet funded
- wallet spendable/balance debited
- POST /drinks/redeem returns 201 and sets status=REDEEMED + redeemedAt
- controller enforces staff-only redeem (Forbidden if role != staff)

Paste the exact command outputs below (psql + curl) for audit:
1) migration:run output
2) SELECT to_regclass('public.drink_orders')
3) POST /drinks/orders response (201)
4) wallet row after debit
5) POST /drinks/redeem response (201)
6) SELECT drink_orders status + redeemedAt
