/*
# Boss timers

Stores the current timer state and an append-only audit trail for every reset
or modification made by an active clan member.
*/

CREATE TABLE IF NOT EXISTS boss_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  respawn_minutes int NOT NULL CHECK (respawn_minutes > 0),
  window_minutes int NOT NULL CHECK (window_minutes >= 0),
  next_spawn_at timestamptz,
  last_action text CHECK (last_action IN ('reset', 'modify')),
  last_action_by uuid REFERENCES clan_members(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id uuid NOT NULL REFERENCES boss_timers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('reset', 'modify')),
  previous_spawn_at timestamptz,
  new_spawn_at timestamptz,
  previous_window_minutes int NOT NULL,
  new_window_minutes int NOT NULL,
  changed_by uuid NOT NULL REFERENCES clan_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boss_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_timer_history_timer ON timer_history(timer_id, created_at DESC);

DROP POLICY IF EXISTS "timers_select_members" ON boss_timers;
CREATE POLICY "timers_select_members" ON boss_timers
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid() AND clan_members.status = 'active'
  ));

DROP POLICY IF EXISTS "timers_insert_members" ON boss_timers;
CREATE POLICY "timers_insert_members" ON boss_timers
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid() AND clan_members.status = 'active'
  ));

DROP POLICY IF EXISTS "timers_update_members" ON boss_timers;
CREATE POLICY "timers_update_members" ON boss_timers
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid() AND clan_members.status = 'active'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid() AND clan_members.status = 'active'
  ));

DROP POLICY IF EXISTS "timer_history_select_members" ON timer_history;
CREATE POLICY "timer_history_select_members" ON timer_history
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid() AND clan_members.status = 'active'
  ));

CREATE OR REPLACE FUNCTION record_timer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
BEGIN
  SELECT id INTO actor_id FROM clan_members WHERE user_id = auth.uid() AND status = 'active';
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Only active clan members can change timers';
  END IF;

  INSERT INTO timer_history (
    timer_id, action, previous_spawn_at, new_spawn_at,
    previous_window_minutes, new_window_minutes, changed_by
  ) VALUES (
    NEW.id, NEW.last_action, OLD.next_spawn_at, NEW.next_spawn_at,
    OLD.window_minutes, NEW.window_minutes, actor_id
  );

  NEW.last_action_by := actor_id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_record_timer_change ON boss_timers;
CREATE TRIGGER trigger_record_timer_change
  BEFORE UPDATE ON boss_timers
  FOR EACH ROW
  WHEN (NEW.last_action IS NOT NULL)
  EXECUTE FUNCTION record_timer_change();

INSERT INTO boss_timers (name, respawn_minutes, window_minutes)
VALUES
  ('170', 80, 5),
  ('180', 90, 5),
  ('Mordy', 960, 960),
  ('210', 130, 5),
  ('215', 135, 5),
  ('Proteus', 1080, 15),
  ('Dino', 1200, 1680),
  ('Bloodthorn', 1200, 1680),
  ('Gelebron', 1200, 1680),
  ('Crom', 2880, 1440),
  ('aggy', 960, 960),
  ('necro', 1080, 960),
  ('hrung', 960, 960),
  ('valley', 360, 60),
  ('test', 900, 900)
ON CONFLICT (name) DO NOTHING;
