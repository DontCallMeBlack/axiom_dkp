import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClanMember, ClanRole, ROLE_LABELS, ROLE_COLORS, CLASSES, CLASS_COLORS, PlayerClass } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Users, Search, Edit3, X, Check, UserMinus } from 'lucide-react';

export function Roster() {
  const { isLeaderOrOfficer, isLeader, isOfficer, member: currentUser, refreshMember } = useAuth();
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [editingMember, setEditingMember] = useState<ClanMember | null>(null);
  const [editForm, setEditForm] = useState({ in_game_name: '', class: '', level: 1, role: 'recruit' as ClanRole, status: 'active' });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clan_members')
      .select('*')
      .order('role', { ascending: false })
      .order('dkp_balance', { ascending: false });
    setMembers(data as ClanMember[] ?? []);
    setLoading(false);
  };

  const filtered = members.filter((m) => {
    const matchSearch = m.in_game_name.toLowerCase().includes(search.toLowerCase()) ||
                        (m.class?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const startEdit = (m: ClanMember) => {
    setEditingMember(m);
    setEditForm({
      in_game_name: m.in_game_name,
      class: m.class ?? '',
      level: m.level,
      role: m.role,
      status: m.status,
    });
  };

  const removeMember = async (m: ClanMember) => {
    if (!isLeader || m.user_id === currentUser?.user_id || m.role === 'leader') return;
    if (!window.confirm(`Remove ${m.in_game_name} from the clan? Their status will be set to kicked.`)) return;

    const { error } = await supabase.rpc('remove_clan_member', { member_id: m.id });
    if (error) {
      alert(error.message);
      return;
    }
    if (editingMember?.id === m.id) setEditingMember(null);
    fetchMembers();
  };

  const saveEdit = async () => {
    if (!editingMember) return;

    const isSelf = editingMember.user_id === currentUser?.user_id;

    if (isSelf) {
      const { error } = await supabase
        .from('clan_members')
        .update({
          in_game_name: editForm.in_game_name,
          class: editForm.class,
          level: editForm.level,
        })
        .eq('id', editingMember.id);
      if (error) { alert(error.message); return; }
      await refreshMember();
    } else if (isLeaderOrOfficer) {
      const updates: Record<string, unknown> = {
        in_game_name: editForm.in_game_name,
        class: editForm.class,
        level: editForm.level,
      };

      if (isLeader) {
        updates.role = editForm.role;
        updates.status = editForm.status;
      }
      const { error } = await supabase
        .from('clan_members')
        .update(updates)
        .eq('id', editingMember.id);
      if (error) { alert(error.message); return; }
    }

    setEditingMember(null);
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Clan Roster</h1>
          <p className="text-sm text-muted">{members.length} members in the clan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            type="text"
            placeholder="Search by name or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-clan pl-10"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="input-clan sm:w-40 cursor-pointer"
        >
          <option value="all">All Ranks</option>
          <option value="leader">Leaders</option>
          <option value="officer">Officers</option>
          <option value="member">Members</option>
          <option value="recruit">Recruits</option>
        </select>
      </div>

      {/* Roster table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-dim">Loading roster...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-dim">No members found</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-clan bg-soft/50">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Class</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3 hidden md:table-cell">Level</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Rank</th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">DKP</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Joined</th>
                  {(isLeaderOrOfficer) && (
                    <th className="px-4 py-3 w-12"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const roleColor = ROLE_COLORS[m.role];
                  const classColor = m.class && m.class in CLASS_COLORS
                    ? CLASS_COLORS[m.class as PlayerClass]
                    : 'text-muted bg-soft border-clan';
                  const isSelf = m.user_id === currentUser?.user_id;
                  const canEdit = isSelf || isLeaderOrOfficer;
                  return (
                    <tr key={m.id} className="border-b border-clan-soft hover:bg-soft/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-clan flex items-center justify-center text-sm font-cinzel font-bold text-gold flex-shrink-0">
                            {m.in_game_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {m.in_game_name}
                              {isSelf && <span className="text-xs text-dim ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-dim sm:hidden">{m.class} · Lv {m.level}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {m.class ? (
                          <span className={`inline-block text-xs px-2 py-1 rounded border ${classColor}`}>{m.class}</span>
                        ) : <span className="text-sm text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted">{m.level}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-1 rounded border ${roleColor}`}>
                          {ROLE_LABELS[m.role]}
                        </span>
                        {m.status !== 'active' && (
                          <span className="block text-xs text-crimson-bright mt-0.5">{m.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-cinzel font-bold text-gold">{m.dkp_balance}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-dim">{new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
                      {isLeaderOrOfficer && (
                        <td className="px-4 py-3">
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEdit(m)}
                                className="p-1.5 rounded hover:bg-clan transition-colors text-muted hover:text-gold"
                                title="Edit member"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {isLeader && !isSelf && m.role !== 'leader' && (
                                <button
                                  onClick={() => removeMember(m)}
                                  className="p-1.5 rounded hover:bg-crimson/15 transition-colors text-muted hover:text-crimson-bright"
                                  title="Remove member"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingMember(null)}>
          <div className="card p-6 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cinzel text-lg font-bold">Edit Member</h3>
              <button onClick={() => setEditingMember(null)} className="text-dim hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">In-Game Name</label>
                <input
                  type="text"
                  value={editForm.in_game_name}
                  onChange={(e) => setEditForm({ ...editForm, in_game_name: e.target.value })}
                  className="input-clan"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Class</label>
                <select
                  value={editForm.class}
                  onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                  className="input-clan cursor-pointer"
                >
                  <option value="">None</option>
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Level</label>
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 1 })}
                  className="input-clan"
                />
              </div>
              {editingMember.user_id !== currentUser?.user_id && isLeader && (
                <>
                  <div>
                    <label className="block text-xs text-muted mb-1.5 font-medium">Rank</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as ClanRole })}
                      className="input-clan cursor-pointer"
                    >
                      <option value="recruit">Recruit</option>
                      <option value="member">Member</option>
                      <option value="officer">Officer</option>
                      <option value="leader">Leader</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5 font-medium">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="input-clan cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="kicked">Kicked</option>
                    </select>
                  </div>
                </>
              )}
              {editingMember.user_id !== currentUser?.user_id && isOfficer && !isLeader && (
                <p className="text-xs text-dim">As an officer, you can edit name, class, and level. Only the leader can change rank and status.</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} className="btn-gold flex-1 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setEditingMember(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
