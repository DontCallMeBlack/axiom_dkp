import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ClanMember, ClanEvent, DkpTransaction, ROLE_LABELS, ROLE_COLORS, ClanRole, CLASS_COLORS, PlayerClass } from '@/types';
import { Trophy, CalendarDays, Users, TrendingUp, Crown, Swords, Shield, ChevronRight } from 'lucide-react';
import { PageId } from '@/components/Layout';

export function Dashboard({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { member, isLeaderOrOfficer } = useAuth();
  const [memberCount, setMemberCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<ClanEvent[]>([]);
  const [topMembers, setTopMembers] = useState<ClanMember[]>([]);
  const [recentDkp, setRecentDkp] = useState<DkpTransaction[]>([]);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('clan_members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      setMemberCount(count ?? 0);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);
      setUpcomingEvents(events as ClanEvent[] ?? []);

      const { data: top } = await supabase
        .from('clan_members')
        .select('*')
        .eq('status', 'active')
        .order('dkp_balance', { ascending: false })
        .limit(5);
      setTopMembers(top as ClanMember[] ?? []);

      const { data: dkp } = await supabase
        .from('dkp_transactions')
        .select('*, clan_members!inner(in_game_name)')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentDkp(dkp as DkpTransaction[] ?? []);
    })();
  }, []);

  const role = (member?.role ?? 'recruit') as ClanRole;
  const roleColorClass = ROLE_COLORS[role];

  const stats = [
    { label: 'Active Members', value: memberCount, icon: Users, color: 'text-emerald-400' },
    { label: 'Your DKP', value: member?.dkp_balance ?? 0, icon: Trophy, color: 'text-gold' },
    { label: 'Upcoming Events', value: upcomingEvents.length, icon: CalendarDays, color: 'text-sky-400' },
    { label: 'Your Rank', value: ROLE_LABELS[role], icon: Shield, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="card p-8 bg-gradient-to-br from-bg-card via-bg-card to-amber-900/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-gold text-sm font-medium mb-2">
            <Crown className="w-4 h-4" />
            <span className="font-cinzel">Welcome, {member?.in_game_name ?? 'Adventurer'}</span>
          </div>
          <h1 className="font-cinzel text-3xl lg:text-4xl font-bold mb-3">
            The Clan Hall Awaits
          </h1>
          <p className="text-muted max-w-2xl text-sm leading-relaxed">
            Track your DKP, view upcoming raids, and manage your clan profile. 
            {isLeaderOrOfficer ? ' As an officer, you have access to the admin panel for managing members and events.' : ' Attend raids and earn points to climb the standings.'}
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={() => onNavigate('dkp')} className="btn-gold flex items-center gap-2">
              <Trophy className="w-4 h-4" /> View DKP Standings
            </button>
            <button onClick={() => onNavigate('events')} className="btn-ghost flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Upcoming Raids
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-soft flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-cinzel font-bold">{stat.value}</p>
              <p className="text-xs text-muted mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top DKP */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-cinzel text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" /> Top DKP
            </h2>
            <button onClick={() => onNavigate('dkp')} className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1">
              Full standings <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {topMembers.length === 0 && <p className="text-sm text-dim text-center py-4">No members yet</p>}
            {topMembers.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-soft transition-colors">
                <span className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold font-cinzel ${
                  i === 0 ? 'bg-amber-500/20 text-gold-bright' : i === 1 ? 'bg-stone-400/20 text-stone-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-soft text-dim'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.in_game_name}</p>
                  <p className={`text-xs ${m.class && m.class in CLASS_COLORS ? CLASS_COLORS[m.class as PlayerClass].split(' ')[0] : 'text-dim'}`}>
                    {m.class ?? 'Unknown'}
                  </p>
                </div>
                <span className="text-sm font-cinzel font-bold text-gold">{m.dkp_balance}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-cinzel text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-sky-400" /> Upcoming Events
            </h2>
            <button onClick={() => onNavigate('events')} className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1">
              All events <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 && <p className="text-sm text-dim text-center py-4">No upcoming events</p>}
            {upcomingEvents.map((ev) => {
              const date = new Date(ev.event_date);
              return (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-soft/50 border border-clan-soft">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-card border border-clan flex-shrink-0">
                    <span className="text-xs text-dim">{date.toLocaleString('en-US', { month: 'short' })}</span>
                    <span className="text-lg font-cinzel font-bold text-gold">{date.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-dim mt-0.5">
                      {date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>
                    {ev.dkp_reward > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gold mt-1">
                        <TrendingUp className="w-3 h-3" /> +{ev.dkp_reward} DKP
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent DKP activity */}
      <div className="card p-6">
        <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-emerald-400" /> Recent DKP Activity
        </h2>
        <div className="space-y-2">
          {recentDkp.length === 0 && <p className="text-sm text-dim text-center py-4">No DKP transactions yet</p>}
          {recentDkp.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                tx.amount > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-crimson/15 text-crimson-bright'
              }`}>
                {tx.amount > 0 ? '+' : ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="font-medium">{tx.clan_members?.in_game_name ?? 'Unknown'}</span>
                  <span className="text-muted"> — {tx.reason}</span>
                </p>
                <p className="text-xs text-dim">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <span className={`text-sm font-cinzel font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-crimson-bright'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
