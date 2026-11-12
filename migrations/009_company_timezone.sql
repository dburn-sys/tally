-- The company's time zone decides what "last month" means for exports (issue #12).
ALTER TABLE companies ADD COLUMN time_zone text NOT NULL DEFAULT 'UTC';

CREATE FUNCTION is_valid_time_zone(tz text) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = tz) $$;

ALTER TABLE companies ADD CONSTRAINT companies_time_zone_valid CHECK (is_valid_time_zone(time_zone));
