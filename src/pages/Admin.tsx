import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClanMember, ClanRole, DkpTransaction, JoinRequest, ROLE_LABELS, ROLE_COLORS, CLASS_COLORS, PlayerClass } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Shield, Users, Trophy, CalendarDays, TrendingUp, TrendingDown, Crown, Check, X } from 'lucide-react';

export function Admin() {
  const { isLeader, isLeaderOrOfficer } = useAuth();
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [transactions, setTransactions] = useState<DkpTransaction[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: m } = await supabase
      .from('clan_members')
      .select('*')
      .order('role', { ascending: false })
      .order('dkp_balance', { ascending: false });
    setMembers(m as ClanMember[] ?? []);
    const { data: requests } = await supabase
      .from('join_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setJoinRequests(requests as JoinRequest[] ?? []);

    const { data: t } = await supabase
      .from('dkp_transactions')
      .select('*, clan_members!inner(in_game_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    setTransactions(t as DkpTransaction[] ?? []);

    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    setEventCount(count ?? 0);
    setLoading(false);
  };

  const reviewRequest = async (request: JoinRequest, status: 'approved' | 'rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('join_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('status', 'pending');
    if (error) {
      alert(error.message);
      return;
    }
    fetchData();
  };

  if (!isLeaderOrOfficer) {
    return (
      <div className="card p-12 text-center">
        <Shield className="w-12 h-12 text-dim mx-auto mb-3" />
        <p className="text-muted">You do not have permission to access the admin panel.</p>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');
  const totalDkp = activeMembers.reduce((sum, m) => sum + m.dkp_balance, 0);
  const totalAwarded = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const stats = [
    { label: 'Active Members', value: activeMembers.length, icon: Users, color: 'text-emerald-400' },
    { label: 'Total DKP', value: totalDkp, icon: Trophy, color: 'text-gold' },
    { label: 'Total Events', value: eventCount, icon: CalendarDays, color: 'text-sky-400' },
    { label: 'DKP Awarded', value: totalAwarded, icon: TrendingUp, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted">
            {isLeader ? 'Full access — Clan Leader' : 'Limited access — Officer'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5">
              <div className={`w-10 h-10 rounded-lg bg-soft flex items-center justify-center ${stat.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>

              {isLeaderOrOfficer && (
                <div className="card p-6">
                  <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-5">
                    <Users className="w-5 h-5 text-gold" /> Join Requests
                  </h2>
                  {joinRequests.length === 0 ? (
                    <p className="text-sm text-dim">No pending join requests.</p>
                  ) : (
                    <div className="space-y-2">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-soft/50 border border-clan-soft">
                          <div className="flex-1 min-w-48">
                            <p className="text-sm font-medium">{request.in_game_name} · {request.class}</p>
                            <p className="text-xs text-dim">{request.email}</p>
                          </div>
                          <button onClick={() => reviewRequest(request, 'approved')} className="btn-gold flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => reviewRequest(request, 'rejected')} className="btn-ghost flex items-center gap-1.5 text-crimson-bright">
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-2xl font-cinzel font-bold">{stat.value}</p>
              <p className="text-xs text-muted mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Member management */}
        <div className="card p-6">
          <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-emerald-400" /> Member Overview
          </h2>
          {loading ? (
            <p className="text-sm text-dim text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-soft/50 border border-clan-soft">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-clan flex items-center justify-center text-xs font-cinzel font-bold text-gold flex-shrink-0">
                    {m.in_game_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.in_game_name}</p>
                    <p className={`text-xs ${m.class && m.class in CLASS_COLORS ? CLASS_COLORS[m.class as PlayerClass].split(' ')[0] : 'text-dim'}`}>
                      {m.class ?? 'Unknown'} · Lv {m.level}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${ROLE_COLORS[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                  <span className="text-sm font-cinzel font-bold text-gold w-10 text-right">{m.dkp_balance}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent DKP transactions */}
        <div className="card p-6">
          <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-gold" /> Recent DKP Transactions
          </h2>
          {loading ? (
            <p className="text-sm text-dim text-center py-4">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-dim text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-soft/50 border border-clan-soft">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.amount > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-crimson/15 text-crimson-bright'
                  }`}>
                    {tx.amount > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{tx.clan_members?.in_game_name ?? 'Unknown'}</span>
                    </p>
                    <p className="text-xs text-dim truncate">{tx.reason}</p>
                  </div>
                  <span className={`text-sm font-cinzel font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-crimson-bright'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rank distribution */}
      <div className="card p-6">
        <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-5">
          <Crown className="w-5 h-5 text-gold" /> Rank Distribution
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['leader', 'officer', 'member', 'recruit'] as ClanRole[]).map((role) => {
            const count = members.filter((m) => m.role === role).length;
            return (
              <div key={role} className="text-center p-4 rounded-lg bg-soft/50 border border-clan-soft">
                <span className={`inline-block text-xs px-2 py-1 rounded border ${ROLE_COLORS[role]} mb-2`}>
                  {ROLE_LABELS[role]}
                </span>
                <p className="text-3xl font-cinzel font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* DKP flow summary */}
      <div className="card p-6">
        <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-gold" /> DKP Flow Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Awarded</span>
            </div>
            <p className="text-2xl font-cinzel font-bold text-emerald-400">+{totalAwarded}</p>
          </div>
          <div className="p-4 rounded-lg bg-crimson/5 border border-crimson/20">
            <div className="flex items-center gap-2 text-crimson-bright mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Spent</span>
            </div>
            <p className="text-2xl font-cinzel font-bold text-crimson-bright">-{totalSpent}</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-gold mb-2">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">In Circulation</span>
            </div>
            <p className="text-2xl font-cinzel font-bold text-gold">{totalDkp}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
