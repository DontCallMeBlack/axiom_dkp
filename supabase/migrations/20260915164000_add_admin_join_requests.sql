/*
# Admin-approved clan joining

Applicants submit a request without triggering Supabase email delivery.
After a leader or officer approves it, the applicant can create an account
with the normal password signup form.
*/

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  in_game_name text NOT NULL CHECK (char_length(trim(in_game_name)) >= 2),
  class text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS join_requests_email_active_idx
  ON public.join_requests (lower(email))
  WHERE status IN ('pending', 'approved');

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "join_requests_insert_public" ON public.join_requests;
CREATE POLICY "join_requests_insert_public" ON public.join_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

DROP POLICY IF EXISTS "join_requests_select_admin" ON public.join_requests;
CREATE POLICY "join_requests_select_admin" ON public.join_requests
  FOR SELECT TO authenticated
  USING (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "join_requests_update_admin" ON public.join_requests;
CREATE POLICY "join_requests_update_admin" ON public.join_requests
  FOR UPDATE TO authenticated
  USING (is_clan_leader_or_officer())
  WITH CHECK (
    is_clan_leader_or_officer()
    AND status IN ('approved', 'rejected')
    AND reviewed_by = auth.uid()
    AND reviewed_at IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.create_clan_member_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.join_requests%ROWTYPE;
BEGIN
  SELECT *
  INTO request_row
  FROM public.join_requests
  WHERE lower(email) = lower(NEW.email)
    AND status = 'approved'
  ORDER BY reviewed_at DESC
  LIMIT 1;

  IF request_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.clan_members (user_id, in_game_name, class, role, level, dkp_balance, status)
  VALUES (NEW.id, request_row.in_game_name, request_row.class, 'recruit', 1, 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.join_requests
  SET status = 'approved'
  WHERE id = request_row.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_clan_member_on_signup ON auth.users;
CREATE TRIGGER trigger_create_clan_member_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_clan_member_on_signup();
