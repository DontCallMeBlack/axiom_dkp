/*
# Boss reset attendance and DKP rewards

Resetting a boss records the attendees and awards 10 DKP to each selected
active clan member in one atomic, authenticated database operation.
*/

CREATE TABLE IF NOT EXISTS boss_timer_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id uuid NOT NULL REFERENCES boss_timers(id) ON DELETE CASCADE,
  timer_history_id uuid NOT NULL REFERENCES timer_history(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES clan_members(id) ON DELETE CASCADE,
  dkp_awarded int NOT NULL DEFAULT 10 CHECK (dkp_awarded > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timer_history_id, member_id)
);

ALTER TABLE boss_timer_attendance ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION record_timer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
BEGIN
  IF current_setting('app.skip_timer_history', true) = 'true' THEN
    RETURN NEW;
  END IF;

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

DROP POLICY IF EXISTS "timer_attendance_select_members" ON boss_timer_attendance;
CREATE POLICY "timer_attendance_select_members" ON boss_timer_attendance
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid() AND clan_members.status = 'active'
  ));

CREATE OR REPLACE FUNCTION public.reset_boss_timer_with_attendance(
  timer_id uuid,
  attendee_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_member_id uuid;
  actor_user_id uuid := auth.uid();
  timer_record boss_timers%ROWTYPE;
  history_id uuid;
  attendee_id uuid;
  reset_time timestamptz := now();
BEGIN
  SELECT id INTO actor_member_id
  FROM clan_members
  WHERE user_id = actor_user_id AND status = 'active';
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Only active clan members can reset timers';
  END IF;

  SELECT * INTO timer_record FROM boss_timers WHERE id = timer_id FOR UPDATE;
  IF timer_record.id IS NULL THEN
    RAISE EXCEPTION 'Boss timer was not found';
  END IF;
  IF attendee_ids IS NULL OR cardinality(attendee_ids) = 0 THEN
    RAISE EXCEPTION 'At least one attendee is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(attendee_ids) selected_id
    WHERE NOT EXISTS (
      SELECT 1 FROM clan_members
      WHERE id = selected_id AND status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'Every attendee must be an active clan member';
  END IF;

  INSERT INTO timer_history (
    timer_id, action, previous_spawn_at, new_spawn_at,
    previous_window_minutes, new_window_minutes, changed_by
  ) VALUES (
    timer_record.id, 'reset', timer_record.next_spawn_at,
    reset_time + (timer_record.respawn_minutes * interval '1 minute'),
    timer_record.window_minutes, timer_record.window_minutes, actor_member_id
  ) RETURNING id INTO history_id;

  PERFORM set_config('app.skip_timer_history', 'true', true);
  UPDATE boss_timers
  SET next_spawn_at = reset_time + (timer_record.respawn_minutes * interval '1 minute'),
      last_action = 'reset',
      last_action_by = actor_member_id,
      updated_at = reset_time
  WHERE id = timer_record.id;
  PERFORM set_config('app.skip_timer_history', 'false', true);

  FOREACH attendee_id IN ARRAY attendee_ids LOOP
    INSERT INTO boss_timer_attendance (timer_id, timer_history_id, member_id, dkp_awarded)
    VALUES (timer_record.id, history_id, attendee_id, 10);

    INSERT INTO dkp_transactions (member_id, amount, reason, awarded_by)
    VALUES (attendee_id, 10, 'Attended boss ' || timer_record.name, actor_user_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_boss_timer_with_attendance(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_boss_timer_with_attendance(uuid, uuid[]) TO authenticated;
