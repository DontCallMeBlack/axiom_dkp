/*
# Leader member management

Provides a guarded removal operation. Leaders cannot remove themselves or
another leader, and the operation is available only to active leaders.
*/

CREATE OR REPLACE FUNCTION public.remove_clan_member(member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  target_role text;
BEGIN
  SELECT id INTO actor_id
  FROM public.clan_members
  WHERE user_id = auth.uid()
    AND role = 'leader'
    AND status = 'active';

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Only the active clan leader can remove members';
  END IF;
  IF member_id = actor_id THEN
    RAISE EXCEPTION 'The clan leader cannot remove themselves';
  END IF;

  SELECT role INTO target_role
  FROM public.clan_members
  WHERE id = member_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Clan member was not found';
  END IF;
  IF target_role = 'leader' THEN
    RAISE EXCEPTION 'The clan leader cannot be removed';
  END IF;

  -- Keep DKP transactions and attendance history while removing the member
  -- from active clan participation.
  UPDATE public.clan_members
  SET status = 'kicked'
  WHERE id = member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_clan_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_clan_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "members_delete_by_leader" ON public.clan_members;
