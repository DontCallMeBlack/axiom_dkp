import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClanMember, DkpTransaction, ROLE_LABELS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Trophy, TrendingUp, TrendingDown, Plus, Minus, X, History, Search } from 'lucide-react';

export function DKP() {
  const { isLeaderOrOfficer } = useAuth();
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [transactions, setTransactions] = useState<DkpTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'standings' | 'history'>('standings');
  const [search, setSearch] = useState('');
  const [showAward, setShowAward] = useState(false);
  const [awardForm, setAwardForm] = useState({ member_id: '', amount: 0, reason: '' });
  const [awardError, setAwardError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: m } = await supabase
      .from('clan_members')
      .select('*')
      .eq('status', 'active')
      .order('dkp_balance', { ascending: false });
    setMembers(m as ClanMember[] ?? []);

    const { data: t } = await supabase
      .from('dkp_transactions')
      .select('*, clan_members!inner(in_game_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(t as DkpTransaction[] ?? []);
    setLoading(false);
  };

  const filteredMembers = members.filter((m) =>
    m.in_game_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.class?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleAward = async () => {
    setAwardError(null);
    if (!awardForm.member_id) { setAwardError('Select a member.'); return; }
    if (awardForm.amount === 0) { setAwardError('Amount cannot be zero.'); return; }
    if (!awardForm.reason.trim()) { setAwardError('Reason is required.'); return; }

    const { error } = await supabase
      .from('dkp_transactions')
      .insert({
        member_id: awardForm.member_id,
        amount: awardForm.amount,
        reason: awardForm.reason.trim(),
      });

    if (error) { setAwardError(error.message); return; }

    setShowAward(false);
    setAwardForm({ member_id: '', amount: 0, reason: '' });
    fetchData();
  };

  const totalDkp = members.reduce((sum, m) => sum + m.dkp_balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-bold">DKP Standings</h1>
            <p className="text-sm text-muted">Total DKP in circulation: {totalDkp}</p>
          </div>
        </div>
        {isLeaderOrOfficer && (
          <button onClick={() => setShowAward(true)} className="btn-gold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Award DKP
          </button>
        )}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-soft rounded-lg w-fit">
        <button
          onClick={() => setView('standings')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'standings' ? 'bg-card text-gold border border-amber-600/30' : 'text-muted hover:text-text'}`}
        >
          Standings
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'history' ? 'bg-card text-gold border border-amber-600/30' : 'text-muted hover:text-text'}`}
        >
          History
        </button>
      </div>

      {view === 'standings' ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-clan pl-10"
            />
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            {loading && <p className="text-center text-dim py-8">Loading standings...</p>}
            {!loading && filteredMembers.length === 0 && <p className="text-center text-dim py-8">No members found</p>}
            {filteredMembers.map((m, i) => (
              <div
                key={m.id}
                className={`card p-4 card-hover flex items-center gap-4 ${i < 3 ? 'border-amber-600/20' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-cinzel font-bold text-lg flex-shrink-0 ${
                  i === 0 ? 'bg-amber-500/20 text-gold-bright border border-amber-500/30' :
                  i === 1 ? 'bg-stone-400/20 text-stone-300 border border-stone-400/30' :
                  i === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                  'bg-soft text-dim'
                }`}>
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-clan flex items-center justify-center text-sm font-cinzel font-bold text-gold flex-shrink-0">
                  {m.in_game_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.in_game_name}</p>
                  <p className="text-xs text-dim">{m.class ?? 'Unknown'} · {ROLE_LABELS[m.role]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-cinzel font-bold text-gold">{m.dkp_balance}</p>
                  <p className="text-xs text-dim">DKP</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* History view */
        <div className="card overflow-hidden">
          {loading && <p className="text-center text-dim py-8">Loading history...</p>}
          {!loading && transactions.length === 0 && <p className="text-center text-dim py-8">No transactions yet</p>}
          {!loading && transactions.length > 0 && (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-clan bg-soft/50">
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Member</th>
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Reason</th>
                    <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-clan-soft hover:bg-soft/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{tx.clan_members?.in_game_name ?? 'Unknown'}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-muted">{tx.reason}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-sm font-cinzel font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-crimson-bright'}`}>
                          {tx.amount > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-dim">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Award DKP modal */}
      {showAward && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAward(false)}>
          <div className="card p-6 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cinzel text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold" /> Award DKP
              </h3>
              <button onClick={() => setShowAward(false)} className="text-dim hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Member</label>
                <select
                  value={awardForm.member_id}
                  onChange={(e) => setAwardForm({ ...awardForm, member_id: e.target.value })}
                  className="input-clan cursor-pointer"
                >
                  <option value="">Select a member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.in_game_name} ({m.dkp_balance} DKP)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Amount</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAwardForm({ ...awardForm, amount: awardForm.amount - 1 })}
                    className="w-10 h-10 rounded-lg bg-soft border border-clan flex items-center justify-center hover:border-crimson/40 transition-colors flex-shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={awardForm.amount}
                    onChange={(e) => setAwardForm({ ...awardForm, amount: parseInt(e.target.value) || 0 })}
                    className="input-clan text-center font-cinzel text-lg"
                  />
                  <button
                    onClick={() => setAwardForm({ ...awardForm, amount: awardForm.amount + 1 })}
                    className="w-10 h-10 rounded-lg bg-soft border border-clan flex items-center justify-center hover:border-emerald-500/40 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-dim mt-1">Use positive numbers to award, negative to spend</p>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Raid attendance, Loot purchase..."
                  value={awardForm.reason}
                  onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })}
                  className="input-clan"
                />
              </div>
              {awardError && (
                <div className="text-sm text-crimson-bright bg-crimson/10 border border-crimson/30 rounded-lg px-4 py-3">
                  {awardError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAward} className="btn-gold flex-1">Confirm Award</button>
              <button onClick={() => setShowAward(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
