/*
# Clan Management — Helper Functions, RLS Policies, Triggers, Seed Data

## Helper Functions
- is_clan_leader_or_officer(): returns true if the current authenticated user is an active leader or officer
- is_clan_leader(): returns true if the current authenticated user is THE clan leader

## RLS Policies
- clan_members: all authenticated can read; users can insert/update own profile; officers can update any; leader can delete
- events: all authenticated can read; officers can insert/update/delete
- dkp_transactions: all authenticated can read; officers can insert; leader can delete
- event_attendance: all authenticated can read; officers can insert/update/delete
- rules: all authenticated can read; officers can insert/update/delete

## Triggers
- update_dkp_balance: auto-adjusts member's dkp_balance when a dkp_transaction is inserted
- award_attendance_dkp: auto-awards DKP when attendance is marked with dkp_awarded > 0

## Seed Data
- 5 initial clan rules across categories
*/

-- ============================================
-- Helper functions (SECURITY DEFINER so they can read clan_members during RLS checks)
-- ============================================
CREATE OR REPLACE FUNCTION is_clan_leader_or_officer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid()
    AND clan_members.role IN ('leader', 'officer')
    AND clan_members.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_clan_leader()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clan_members
    WHERE clan_members.user_id = auth.uid()
    AND clan_members.role = 'leader'
    AND clan_members.status = 'active'
  );
$$;

-- ============================================
-- clan_members policies
-- ============================================
DROP POLICY IF EXISTS "members_select_all" ON clan_members;
CREATE POLICY "members_select_all" ON clan_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "members_insert_own" ON clan_members;
CREATE POLICY "members_insert_own" ON clan_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_update_own" ON clan_members;
CREATE POLICY "members_update_own" ON clan_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_update_by_officer" ON clan_members;
CREATE POLICY "members_update_by_officer" ON clan_members
  FOR UPDATE TO authenticated USING (is_clan_leader_or_officer())
  WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "members_delete_by_leader" ON clan_members;
CREATE POLICY "members_delete_by_leader" ON clan_members
  FOR DELETE TO authenticated USING (is_clan_leader());

-- ============================================
-- events policies
-- ============================================
DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_by_officer" ON events;
CREATE POLICY "events_insert_by_officer" ON events
  FOR INSERT TO authenticated WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "events_update_by_officer" ON events;
CREATE POLICY "events_update_by_officer" ON events
  FOR UPDATE TO authenticated USING (is_clan_leader_or_officer())
  WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "events_delete_by_officer" ON events;
CREATE POLICY "events_delete_by_officer" ON events
  FOR DELETE TO authenticated USING (is_clan_leader_or_officer());

-- ============================================
-- dkp_transactions policies
-- ============================================
DROP POLICY IF EXISTS "dkp_select_all" ON dkp_transactions;
CREATE POLICY "dkp_select_all" ON dkp_transactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "dkp_insert_by_officer" ON dkp_transactions;
CREATE POLICY "dkp_insert_by_officer" ON dkp_transactions
  FOR INSERT TO authenticated WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "dkp_delete_by_leader" ON dkp_transactions;
CREATE POLICY "dkp_delete_by_leader" ON dkp_transactions
  FOR DELETE TO authenticated USING (is_clan_leader());

-- ============================================
-- event_attendance policies
-- ============================================
DROP POLICY IF EXISTS "attendance_select_all" ON event_attendance;
CREATE POLICY "attendance_select_all" ON event_attendance
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_insert_by_officer" ON event_attendance;
CREATE POLICY "attendance_insert_by_officer" ON event_attendance
  FOR INSERT TO authenticated WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "attendance_update_by_officer" ON event_attendance;
CREATE POLICY "attendance_update_by_officer" ON event_attendance
  FOR UPDATE TO authenticated USING (is_clan_leader_or_officer())
  WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "attendance_delete_by_officer" ON event_attendance;
CREATE POLICY "attendance_delete_by_officer" ON event_attendance
  FOR DELETE TO authenticated USING (is_clan_leader_or_officer());

-- ============================================
-- rules policies
-- ============================================
DROP POLICY IF EXISTS "rules_select_all" ON rules;
CREATE POLICY "rules_select_all" ON rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rules_insert_by_officer" ON rules;
CREATE POLICY "rules_insert_by_officer" ON rules
  FOR INSERT TO authenticated WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "rules_update_by_officer" ON rules;
CREATE POLICY "rules_update_by_officer" ON rules
  FOR UPDATE TO authenticated USING (is_clan_leader_or_officer())
  WITH CHECK (is_clan_leader_or_officer());

DROP POLICY IF EXISTS "rules_delete_by_officer" ON rules;
CREATE POLICY "rules_delete_by_officer" ON rules
  FOR DELETE TO authenticated USING (is_clan_leader_or_officer());

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_dkp_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clan_members
  SET dkp_balance = dkp_balance + NEW.amount
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_dkp_balance ON dkp_transactions;
CREATE TRIGGER trigger_update_dkp_balance
  AFTER INSERT ON dkp_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_dkp_balance();

CREATE OR REPLACE FUNCTION award_attendance_dkp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.attended = true AND NEW.dkp_awarded > 0 THEN
    UPDATE clan_members
    SET dkp_balance = dkp_balance + NEW.dkp_awarded
    WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_attendance_dkp ON event_attendance;
CREATE TRIGGER trigger_award_attendance_dkp
  AFTER INSERT ON event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION award_attendance_dkp();

-- ============================================
-- Seed rules
-- ============================================
INSERT INTO rules (title, content, category, display_order) VALUES
('Welcome to the Clan', 'All new members start as Recruits. You will be promoted to Member once you have attended at least 3 raids and shown dedication to the clan.', 'general', 1),
('DKP System', 'DKP (Dragon Kill Points) are earned by attending raids and events. Points are spent on loot drops during raids. The member with the highest DKP who wants an item wins it.', 'dkp', 1),
('Raid Attendance', 'Raids are scheduled regularly. Attendance is tracked and DKP is awarded for participation. Notify an officer if you cannot attend a scheduled raid.', 'raid', 1),
('Code of Conduct', 'Treat all clan members with respect. No toxic behavior, cheating, or drama. Violations may result in DKP penalties or removal from the clan.', 'conduct', 1),
('Rank Structure', 'Leader runs the clan. Officers assist with management and raid leading. Members are full clan members. Recruits are on probationary status.', 'ranking', 1)
ON CONFLICT DO NOTHING;
