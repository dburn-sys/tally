CREATE TABLE expense_events (
  id          bigserial PRIMARY KEY,
  expense_id  uuid NOT NULL REFERENCES expenses(id),
  actor_id    uuid NOT NULL REFERENCES users(id),
  from_status text NOT NULL,
  to_status   text NOT NULL,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expense_events_expense ON expense_events (expense_id, at);
