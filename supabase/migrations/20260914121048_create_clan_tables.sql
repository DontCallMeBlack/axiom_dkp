/*
# Celtic Heroes Clan Management — Tables

Creates clan_members, events, dkp_transactions, event_attendance, and rules tables
with RLS enabled. Policies added in a follow-up migration.
*/

-- ============================================
-- clan_members
-- ============================================
CREATE TABLE IF NOT EXISTS clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  in_game_name text NOT NULL,
  class text,
  level int NOT NULL DEFAULT 1,
  role text NOT NULL DEFAULT 'recruit' CHECK (role IN ('leader', 'officer', 'member', 'recruit')),
  dkp_balance int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'kicked')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  dkp_reward int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- dkp_transactions
-- ============================================
CREATE TABLE IF NOT EXISTS dkp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES clan_members(id) ON DELETE CASCADE,
  amount int NOT NULL,
  reason text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  awarded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dkp_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- event_attendance
-- ============================================
CREATE TABLE IF NOT EXISTS event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES clan_members(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT false,
  dkp_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, member_id)
);

ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- rules
-- ============================================
CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'dkp', 'raid', 'conduct', 'ranking')),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clan_members_role ON clan_members(role);
CREATE INDEX IF NOT EXISTS idx_clan_members_dkp ON clan_members(dkp_balance DESC);
CREATE INDEX IF NOT EXISTS idx_dkp_transactions_member ON dkp_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_dkp_transactions_created ON dkp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_member ON event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category);
