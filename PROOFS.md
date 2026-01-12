**# TABZ Proof Artifacts Index**



**This file lists existing proof scripts / proof commands already executed and trusted.**

**No new logic is introduced here.**



**## Wallet / Cashouts**

**- Single pending cashout gate (PENDING only one per wallet)**

**- adminFailCashout atomic refund + ledger row (QueryRunner txn)**

**- cancelCashout refund + ledger row**

**- retryCashout creates new PENDING with retryOfCashoutId**



**## Migrations / DB**

**- Migration idempotency pass (re-run safe)**



**## Credits (if applicable)**

**- credits multifunder proof (requests → fund → ledger invariants)**



**## Notes**

**- Proof outputs stored in chat logs; this index prevents re-litigation.**



