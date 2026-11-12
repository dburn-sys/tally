-- Payouts (roadmap M4). Both tables are company-owned: MIG-1 and MIG-2 (ADR-0001).

CREATE TABLE payouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id)
               DEFAULT nullif(current_setting('tally.company_id', true), '')::uuid,
  expense_id   uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency     text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  provider_ref text,
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (expense_id, company_id) REFERENCES expenses (id, company_id),
  FOREIGN KEY (created_by, company_id) REFERENCES users (id, company_id),
  CONSTRAINT payouts_id_company UNIQUE (id, company_id)
);
CREATE INDEX payouts_company ON payouts (company_id);
-- At most one payout per expense that isn't failed: no double payment.
CREATE UNIQUE INDEX payouts_one_live_per_expense ON payouts (expense_id) WHERE status <> 'failed';

-- One row per provider event id, so a repeated webhook has no extra effect.
CREATE TABLE webhook_events (
  id          text PRIMARY KEY,
  company_id  uuid NOT NULL REFERENCES companies(id)
              DEFAULT nullif(current_setting('tally.company_id', true), '')::uuid,
  payout_id   uuid NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (payout_id, company_id) REFERENCES payouts (id, company_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['payouts', 'webhook_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY company_isolation ON %I
      USING (company_id = nullif(current_setting('tally.company_id', true), '')::uuid)
      WITH CHECK (company_id = nullif(current_setting('tally.company_id', true), '')::uuid)$f$, t);
  END LOOP;
END $$;
-- Privileges for tally_app come from the default privileges set in 007.
