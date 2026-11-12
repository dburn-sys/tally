CREATE TABLE expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount      real NOT NULL,
  currency    char(3) NOT NULL DEFAULT 'USD',
  spent_on    date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
