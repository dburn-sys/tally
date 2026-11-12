-- Spending policies (issue #30). Company-owned: B-1, B-2 (ADR-0001).
CREATE TABLE spending_policies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id)
              DEFAULT nullif(current_setting('tally.company_id', true), '')::uuid,
  category    text NOT NULL CHECK (category IN ('travel', 'meals', 'lodging', 'supplies', 'other')),
  limit_cents bigint NOT NULL CHECK (limit_cents > 0),
  currency    text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  updated_by  uuid NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, category),
  FOREIGN KEY (updated_by, company_id) REFERENCES users (id, company_id)
);
CREATE INDEX spending_policies_company ON spending_policies (company_id);
ALTER TABLE spending_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON spending_policies
  USING (company_id = nullif(current_setting('tally.company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('tally.company_id', true), '')::uuid);

-- The warning an expense got when it was submitted (sprint default: nullable).
ALTER TABLE expenses ADD COLUMN policy_warning text;
