ALTER TABLE expenses ADD COLUMN amount_cents bigint;
UPDATE expenses SET amount_cents = round(amount::numeric * 100);
ALTER TABLE expenses ALTER COLUMN amount_cents SET NOT NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount_cents > 0);
ALTER TABLE expenses DROP COLUMN amount;
