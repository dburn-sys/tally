-- Company isolation (ADR-0001). Every company-owned table gets company_id,
-- row-level security that is ENABLED and FORCED, and one policy.

CREATE TABLE companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rows from before this migration belong to one default company.
INSERT INTO companies (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default company');

-- New rows take their company from the request's setting, so inserts can't
-- forget it. The policy's WITH CHECK refuses any other value.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'api_keys', 'expenses', 'expense_events'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN company_id uuid REFERENCES companies(id)', t);
    EXECUTE format('UPDATE %I SET company_id = %L', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
    EXECUTE format($f$ALTER TABLE %I ALTER COLUMN company_id
      SET DEFAULT nullif(current_setting('tally.company_id', true), '')::uuid$f$, t);
    EXECUTE format('CREATE INDEX %I ON %I (company_id)', t || '_company', t);
  END LOOP;
END $$;

-- A row can only point at a user or expense in its own company.
ALTER TABLE users    ADD CONSTRAINT users_id_company    UNIQUE (id, company_id);
ALTER TABLE expenses ADD CONSTRAINT expenses_id_company UNIQUE (id, company_id);
ALTER TABLE api_keys ADD CONSTRAINT api_keys_user_company
  FOREIGN KEY (user_id, company_id) REFERENCES users (id, company_id);
ALTER TABLE expenses ADD CONSTRAINT expenses_user_company
  FOREIGN KEY (user_id, company_id) REFERENCES users (id, company_id);
ALTER TABLE expense_events ADD CONSTRAINT expense_events_expense_company
  FOREIGN KEY (expense_id, company_id) REFERENCES expenses (id, company_id);
ALTER TABLE expense_events ADD CONSTRAINT expense_events_actor_company
  FOREIGN KEY (actor_id, company_id) REFERENCES users (id, company_id);

-- Row-level security. FORCE matters: without it, the table owner skips every policy.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'api_keys', 'expenses', 'expense_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY company_isolation ON %I
      USING (company_id = nullif(current_setting('tally.company_id', true), '')::uuid)
      WITH CHECK (company_id = nullif(current_setting('tally.company_id', true), '')::uuid)$f$, t);
  END LOOP;
END $$;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON companies
  USING (id = nullif(current_setting('tally.company_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('tally.company_id', true), '')::uuid);

-- The role the application connects as. It owns nothing, so policies always apply.
-- Its password is set outside migrations (scripts/migrate.ts reads TALLY_APP_PASSWORD).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tally_app') THEN
    CREATE ROLE tally_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO tally_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON companies, users, api_keys, expenses, expense_events TO tally_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tally_app;
-- Tables and sequences created by later migrations get the same privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tally_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO tally_app;

-- Authentication happens before the company is known. These three lookups are
-- the only way past the policies, and each returns one user's identity fields.
CREATE FUNCTION auth_user_by_email(p_email text)
RETURNS TABLE (id uuid, company_id uuid, role text, password_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.id, u.company_id, u.role, u.password_hash FROM users u WHERE u.email = lower(p_email)
$$;

CREATE FUNCTION auth_user_by_id(p_id uuid)
RETURNS TABLE (id uuid, email text, company_id uuid, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.id, u.email, u.company_id, u.role FROM users u WHERE u.id = p_id
$$;

CREATE FUNCTION auth_user_by_key(p_key_hash text)
RETURNS TABLE (id uuid, email text, company_id uuid, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.id, u.email, u.company_id, u.role
  FROM api_keys k JOIN users u ON u.id = k.user_id AND u.company_id = k.company_id
  WHERE k.key_hash = p_key_hash
$$;

REVOKE ALL ON FUNCTION auth_user_by_email(text), auth_user_by_id(uuid), auth_user_by_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_by_email(text), auth_user_by_id(uuid), auth_user_by_key(text) TO tally_app;
