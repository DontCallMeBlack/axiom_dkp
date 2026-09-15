export type ClanRole = 'leader' | 'officer' | 'member' | 'recruit';
export type MemberStatus = 'active' | 'inactive' | 'kicked';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type EventStatus = 'scheduled' | 'completed' | 'cancelled';
export type RuleCategory = 'general' | 'dkp' | 'raid' | 'conduct' | 'ranking';
export type TimerAction = 'reset' | 'modify';
export type PlayerClass = 'Warrior' | 'Ranger' | 'Rogue' | 'Druid' | 'Mage';

export interface ClanMember {
  id: string;
  user_id: string;
  in_game_name: string;
  class: string | null;
  level: number;
  role: ClanRole;
  dkp_balance: number;
  status: MemberStatus;
  joined_at: string;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  email: string;
  in_game_name: string;
  class: string;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DkpTransaction {
  id: string;
  member_id: string;
  amount: number;
  reason: string;
  event_id: string | null;
  awarded_by: string;
  created_at: string;
  clan_members?: Pick<ClanMember, 'in_game_name'>;
}

export interface ClanEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  dkp_reward: number;
  status: EventStatus;
  created_by: string;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  member_id: string;
  attended: boolean;
  dkp_awarded: number;
  created_at: string;
}

export interface ClanRule {
  id: string;
  title: string;
  content: string;
  category: RuleCategory;
  display_order: number;
  created_at: string;
}

export interface BossTimer {
  id: string;
  name: string;
  respawn_minutes: number;
  window_minutes: number;
  dkp_award: number;
  next_spawn_at: string | null;
  last_action: TimerAction | null;
  last_action_by: string | null;
  updated_at: string;
  last_action_member?: Pick<ClanMember, 'in_game_name'> | null;
}

export const BOSS_DKP_VALUES: Record<string, number> = {
  '170': 20,
  '180': 25,
  Mordy: 10,
  '210': 20,
  '215': 20,
  Proteus: 0,
  Dino: 65,
  Bloodthorn: 30,
  Gelebron: 50,
  Crom: 120,
  aggy: 5,
  necro: 20,
  hrung: 5,
  valley: 5,
  test: 0,
};

export interface TimerHistory {
  id: string;
  timer_id: string;
  action: TimerAction;
  previous_spawn_at: string | null;
  new_spawn_at: string | null;
  previous_window_minutes: number;
  new_window_minutes: number;
  changed_by: string;
  created_at: string;
  changed_by_member?: Pick<ClanMember, 'in_game_name'> | null;
  boss_timers?: Pick<BossTimer, 'name'> | null;
}

export const ROLE_LABELS: Record<ClanRole, string> = {
  leader: 'Leader',
  officer: 'Officer',
  member: 'Member',
  recruit: 'Recruit',
};

export const ROLE_COLORS: Record<ClanRole, string> = {
  leader: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  officer: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  member: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  recruit: 'text-stone-400 bg-stone-400/10 border-stone-400/30',
};

export const CLASSES: PlayerClass[] = [
  'Warrior',
  'Ranger',
  'Rogue',
  'Druid',
  'Mage',
];

export const CLASS_COLORS: Record<PlayerClass, string> = {
  Warrior: 'text-red-400 bg-red-400/10 border-red-400/30',
  Ranger: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Rogue: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  Druid: 'text-green-400 bg-green-400/10 border-green-400/30',
  Mage: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
};

export const ROLE_RANK: Record<ClanRole, number> = {
  leader: 4,
  officer: 3,
  member: 2,
  recruit: 1,
};
