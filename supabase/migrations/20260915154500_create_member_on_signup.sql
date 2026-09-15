/*
# Create clan member profiles during signup

Supabase projects commonly require email confirmation. In that case signUp()
returns a user without a session, so an authenticated client insert would fail
the clan_members RLS policy. This trigger creates the initial recruit profile
inside the database instead.
*/

CREATE OR REPLACE FUNCTION create_clan_member_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clan_members (
    user_id,
    in_game_name,
    class,
    role,
    level,
    dkp_balance,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'in_game_name', ''), 'New Member'),
    NULLIF(NEW.raw_user_meta_data->>'class', ''),
    'recruit',
    1,
    0,
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_clan_member_on_signup ON auth.users;
CREATE TRIGGER trigger_create_clan_member_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_clan_member_on_signup();
