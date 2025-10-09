PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE IF NOT EXISTS events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  date             TEXT    NOT NULL,
  ticketsAvailable INTEGER NOT NULL CHECK (ticketsAvailable >= 0),

  createdAt        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TRIGGER IF NOT EXISTS trg_events_updatedAt
AFTER UPDATE ON events
FOR EACH ROW
BEGIN
  UPDATE events
     SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- mock data
INSERT INTO events (name, date, ticketsAvailable)
SELECT 'Clemson vs. Florida State', '2025-10-18', 150
WHERE NOT EXISTS (SELECT 1 FROM events WHERE name = 'Clemson vs. Florida State');

INSERT INTO events (name, date, ticketsAvailable)
SELECT 'Clemson vs. South Carolina', '2025-11-29', 200
WHERE NOT EXISTS (SELECT 1 FROM events WHERE name = 'Clemson vs. South Carolina');

INSERT INTO events (name, date, ticketsAvailable)
SELECT 'Clemson Homecoming Game', '2025-10-25', 175
WHERE NOT EXISTS (SELECT 1 FROM events WHERE name = 'Clemson Homecoming Game');

COMMIT;
