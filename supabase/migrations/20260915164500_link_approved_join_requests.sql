/*
# Link approved join requests

If the applicant already has an auth account, approval creates their clan
profile immediately. New applicants are linked by the auth signup trigger
after they create an approved account.
*/

CREATE OR REPLACE FUNCTION public.create_member_for_approved_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved_user_id uuid;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO approved_user_id
  FROM auth.users
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF approved_user_id IS NOT NULL THEN
    INSERT INTO public.clan_members (user_id, in_game_name, class, role, level, dkp_balance, status)
    VALUES (approved_user_id, NEW.in_game_name, NEW.class, 'recruit', 1, 0, 'active')
    ON CONFLICT (user_id) DO UPDATE
      SET in_game_name = EXCLUDED.in_game_name,
          class = EXCLUDED.class,
          status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_member_for_approved_request ON public.join_requests;
CREATE TRIGGER trigger_create_member_for_approved_request
  AFTER UPDATE OF status ON public.join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.create_member_for_approved_request();
