ALTER TABLE expenses ADD COLUMN category text NOT NULL DEFAULT 'other';
ALTER TABLE expenses ALTER COLUMN category DROP DEFAULT;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('travel', 'meals', 'lodging', 'supplies', 'other'));
