ALTER TABLE expenses ADD COLUMN status text NOT NULL DEFAULT 'submitted'
  CHECK (status IN ('submitted', 'approved', 'rejected', 'paid'));
