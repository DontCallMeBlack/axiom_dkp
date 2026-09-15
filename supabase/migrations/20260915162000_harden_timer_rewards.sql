/*
# Hard-code boss DKP values and prevent accidental/direct resets

Values are taken from the Axiom rules PDF. Timer changes must use the
authenticated RPCs so resets always require attendance and confirmation in the
client, while database-side validation prevents bypassing the rules.
*/

ALTER TABLE public.boss_timers
  ADD COLUMN IF NOT EXISTS dkp_award int NOT NULL DEFAULT 0;

UPDATE public.boss_timers
SET dkp_award = CASE name
  WHEN '170' THEN 20
  WHEN '180' THEN 25
  WHEN 'Mordy' THEN 10
  WHEN '210' THEN 20
  WHEN '215' THEN 20
  WHEN 'Proteus' THEN 0
  WHEN 'Dino' THEN 65
  WHEN 'Bloodthorn' THEN 30
  WHEN 'Gelebron' THEN 50
  WHEN 'Crom' THEN 120
  WHEN 'aggy' THEN 5
  WHEN 'necro' THEN 20
  WHEN 'hrung' THEN 5
  WHEN 'valley' THEN 5
  WHEN 'test' THEN 0
  ELSE 0
END;

DROP POLICY IF EXISTS "timers_update_members" ON public.boss_timers;

CREATE OR REPLACE FUNCTION public.modify_boss_timer(
  timer_id uuid,
  new_next_spawn_at timestamptz,
  new_window_minutes int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  old_next_spawn_at timestamptz;
  old_window_minutes int;
BEGIN
  SELECT id INTO actor_id
  FROM clan_members
  WHERE user_id = auth.uid() AND status = 'active';
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Only active clan members can modify timers';
  END IF;
  IF new_next_spawn_at IS NULL OR new_window_minutes < 0 THEN
    RAISE EXCEPTION 'Invalid timer values';
  END IF;

  SELECT next_spawn_at, window_minutes
  INTO old_next_spawn_at, old_window_minutes
  FROM boss_timers
  WHERE id = timer_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boss timer was not found';
  END IF;

  PERFORM set_config('app.skip_timer_history', 'true', true);
  UPDATE boss_timers
  SET next_spawn_at = new_next_spawn_at,
      window_minutes = new_window_minutes,
      last_action = 'modify',
      last_action_by = actor_id,
      updated_at = now()
  WHERE id = timer_id;
  PERFORM set_config('app.skip_timer_history', 'false', true);

  INSERT INTO timer_history (
    timer_id, action, previous_spawn_at, new_spawn_at,
    previous_window_minutes, new_window_minutes, changed_by
  ) VALUES (
    timer_id, 'modify', old_next_spawn_at, new_next_spawn_at,
    old_window_minutes, new_window_minutes, actor_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.modify_boss_timer(uuid, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.modify_boss_timer(uuid, timestamptz, int) TO authenticated;

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
  timer_record public.boss_timers%ROWTYPE;
  history_id uuid;
  attendee_id uuid;
  reset_time timestamptz := now();
BEGIN
  SELECT id INTO actor_member_id
  FROM public.clan_members
  WHERE user_id = actor_user_id AND status = 'active';
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Only active clan members can reset timers';
  END IF;

  SELECT * INTO timer_record FROM public.boss_timers WHERE id = timer_id FOR UPDATE;
  IF timer_record.id IS NULL THEN
    RAISE EXCEPTION 'Boss timer was not found';
  END IF;
  IF timer_record.dkp_award <= 0 THEN
    RAISE EXCEPTION 'This boss does not have a configured DKP award';
  END IF;
  IF attendee_ids IS NULL OR cardinality(attendee_ids) = 0 THEN
    RAISE EXCEPTION 'At least one attendee is required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(attendee_ids) selected_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clan_members
      WHERE id = selected_id AND status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'Every attendee must be an active clan member';
  END IF;

  INSERT INTO public.timer_history (
    timer_id, action, previous_spawn_at, new_spawn_at,
    previous_window_minutes, new_window_minutes, changed_by
  ) VALUES (
    timer_record.id, 'reset', timer_record.next_spawn_at,
    reset_time + (timer_record.respawn_minutes * interval '1 minute'),
    timer_record.window_minutes, timer_record.window_minutes, actor_member_id
  ) RETURNING id INTO history_id;

  PERFORM set_config('app.skip_timer_history', 'true', true);
  UPDATE public.boss_timers
  SET next_spawn_at = reset_time + (timer_record.respawn_minutes * interval '1 minute'),
      last_action = 'reset',
      last_action_by = actor_member_id,
      updated_at = reset_time
  WHERE id = timer_record.id;
  PERFORM set_config('app.skip_timer_history', 'false', true);

  FOREACH attendee_id IN ARRAY attendee_ids LOOP
    INSERT INTO public.boss_timer_attendance (timer_id, timer_history_id, member_id, dkp_awarded)
    VALUES (timer_record.id, history_id, attendee_id, timer_record.dkp_award);

    INSERT INTO public.dkp_transactions (member_id, amount, reason, awarded_by)
    VALUES (attendee_id, timer_record.dkp_award, 'Attended boss ' || timer_record.name, actor_user_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_boss_timer_with_attendance(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_boss_timer_with_attendance(uuid, uuid[]) TO authenticated;
