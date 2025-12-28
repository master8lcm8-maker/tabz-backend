UPDATE wallet_transactions
SET metadata = '{"reason":"cashout_cancel_refund","cashoutId":104,"via":"backfill"}'
WHERE id = 137;

UPDATE wallet_transactions
SET metadata = '{"reason":"cashout_cancel_refund","cashoutId":105,"via":"backfill"}'
WHERE id = 138;

UPDATE wallet_transactions
SET metadata = '{"reason":"cashout_cancel_refund","cashoutId":109,"via":"backfill"}'
WHERE id = 139;

SELECT id, metadata FROM wallet_transactions WHERE id IN (137,138,139) ORDER BY id;
