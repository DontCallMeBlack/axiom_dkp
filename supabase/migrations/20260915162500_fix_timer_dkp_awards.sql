/*
# Correct timer DKP awards and balance refresh

Replaces the initial fixed-10 DKP implementation with each boss's configured
value from boss_timers.dkp_award. Existing transaction triggers continue to
update clan_members.dkp_balance exactly once per transaction.
*/

ALTER TABLE public.boss_timers
  ADD COLUMN IF NOT EXISTS dkp_award int NOT NULL DEFAULT 0;

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

  SELECT * INTO timer_record
  FROM public.boss_timers
  WHERE id = timer_id
  FOR UPDATE;
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
    INSERT INTO public.boss_timer_attendance (
      timer_id, timer_history_id, member_id, dkp_awarded
    ) VALUES (
      timer_record.id, history_id, attendee_id, timer_record.dkp_award
    );

    INSERT INTO public.dkp_transactions (member_id, amount, reason, awarded_by)
    VALUES (
      attendee_id,
      timer_record.dkp_award,
      'Attended boss ' || timer_record.name,
      actor_user_id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_boss_timer_with_attendance(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_boss_timer_with_attendance(uuid, uuid[]) TO authenticated;

SELECT set_config('app.skip_timer_history', 'true', true);

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
  ELSE dkp_award
END;

SELECT set_config('app.skip_timer_history', 'false', true);
