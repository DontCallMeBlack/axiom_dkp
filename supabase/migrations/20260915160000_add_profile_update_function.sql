/*
# Update the authenticated member's own profile

OTP users can receive a fallback profile from the signup trigger before the
browser has a normal session. This function lets the authenticated user finish
that profile without exposing updates to other clan members.
*/

CREATE OR REPLACE FUNCTION public.update_my_clan_profile(
  new_in_game_name text,
  new_class text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF length(trim(new_in_game_name)) < 2 THEN
    RAISE EXCEPTION 'In-game name must be at least 2 characters';
  END IF;

  IF new_class NOT IN ('Warrior', 'Ranger', 'Rogue', 'Druid', 'Mage') THEN
    RAISE EXCEPTION 'Invalid class';
  END IF;

  UPDATE public.clan_members
  SET in_game_name = trim(new_in_game_name),
      class = new_class
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clan member profile was not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_clan_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_clan_profile(text, text) TO authenticated;
