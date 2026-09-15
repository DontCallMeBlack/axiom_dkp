import { useEffect, useMemo, useState } from 'react';
import { Clock3, History, Pencil, RotateCcw, Timer as TimerIcon, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { BossTimer, TimerHistory } from '@/types';

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return 'Ready';
  const totalMinutes = Math.ceil(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`].filter(Boolean).join(' ');
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining ? ` ${remaining}m` : ''}`;
};

export function Timers() {
  const { member } = useAuth();
  const [timers, setTimers] = useState<BossTimer[]>([]);
  const [history, setHistory] = useState<TimerHistory[]>([]);
  const [editing, setEditing] = useState<BossTimer | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState('');
  const [windowMinutes, setWindowMinutes] = useState('');
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimers = async () => {
    const { data, error: fetchError } = await supabase
      .from('boss_timers')
      .select('*, last_action_member:clan_members!last_action_by(in_game_name)')
      .order('id');
    if (fetchError) setError(fetchError.message);
    setTimers((data as BossTimer[]) ?? []);
  };

  useEffect(() => {
    Promise.all([fetchTimers(), supabase
      .from('timer_history')
      .select('*, changed_by_member:clan_members!changed_by(in_game_name), boss_timers!inner(name)')
      .order('created_at', { ascending: false })
      .limit(100)
    ]).then(([, historyResult]) => {
      if (historyResult.error) setError(historyResult.error.message);
      setHistory((historyResult.data as TimerHistory[]) ?? []);
      setLoading(false);
    });
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const openEdit = (timer: BossTimer) => {
    setEditing(timer);
    setRemainingMinutes(timer.next_spawn_at
      ? Math.max(0, Math.ceil((new Date(timer.next_spawn_at).getTime() - Date.now()) / 60000)).toString()
      : timer.respawn_minutes.toString());
    setWindowMinutes(timer.window_minutes.toString());
    setError(null);
  };

  const saveTimer = async () => {
    if (!editing || !member) return;
    const remaining = Number(remainingMinutes);
    const window = Number(windowMinutes);
    if (!Number.isInteger(remaining) || remaining < 0 || !Number.isInteger(window) || window < 0) {
      setError('Enter whole numbers of 0 or greater.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.from('boss_timers').update({
      next_spawn_at: new Date(Date.now() + remaining * 60000).toISOString(),
      window_minutes: window,
      last_action: 'modify',
    }).eq('id', editing.id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setEditing(null);
    await Promise.all([fetchTimers(), fetchHistory()]);
  };

  const resetTimer = async (timer: BossTimer) => {
    const { error: updateError } = await supabase.from('boss_timers').update({
      next_spawn_at: new Date(Date.now() + timer.respawn_minutes * 60000).toISOString(),
      last_action: 'reset',
    }).eq('id', timer.id);
    if (updateError) setError(updateError.message);
    else await Promise.all([fetchTimers(), fetchHistory()]);
  };

  const fetchHistory = async () => {
    const { data, error: historyError } = await supabase
      .from('timer_history')
      .select('*, changed_by_member:clan_members!changed_by(in_game_name), boss_timers!inner(name)')
      .order('created_at', { ascending: false }).limit(100);
    if (historyError) setError(historyError.message);
    setHistory((data as TimerHistory[]) ?? []);
  };

  const historyByTimer = useMemo(() => {
    const grouped: Record<string, TimerHistory[]> = {};
    history.forEach((entry) => {
      const timerName = (entry as TimerHistory & { boss_timers?: { name: string } }).boss_timers?.name;
      if (timerName) (grouped[timerName] ??= []).push(entry);
    });
    return grouped;
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <TimerIcon className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Boss Timers</h1>
          <p className="text-sm text-muted">Reset or adjust a timer when a boss is killed. Every action is recorded.</p>
        </div>
      </div>

      {error && <div className="card p-3 text-sm text-crimson-bright">{error}</div>}
      {loading ? <div className="card p-8 text-center text-dim">Loading timers...</div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {timers.map((timer) => {
            const seconds = timer.next_spawn_at ? Math.max(0, Math.floor((new Date(timer.next_spawn_at).getTime() - now) / 1000)) : 0;
            const actor = timer.last_action_member?.in_game_name;
            return (
              <div key={timer.id} className="card card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-cinzel text-lg font-bold">{timer.name}</h2>
                    <p className="text-xs text-dim mt-1">Respawn: {formatMinutes(timer.respawn_minutes)} · Window: {formatMinutes(timer.window_minutes)}</p>
                  </div>
                  <Clock3 className={`w-5 h-5 ${seconds ? 'text-gold' : 'text-emerald-400'}`} />
                </div>
                <p className={`font-cinzel text-3xl font-bold mt-5 ${seconds ? 'text-gold-bright' : 'text-emerald-400'}`}>{formatDuration(seconds)}</p>
                <p className="text-xs text-dim mt-1">{timer.next_spawn_at ? `Expected ${new Date(timer.next_spawn_at).toLocaleString()}` : 'Not started'}</p>
                {actor && <p className="text-xs text-muted mt-3">Last {timer.last_action} by <span className="text-gold">{actor}</span></p>}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => resetTimer(timer)} className="btn-gold flex-1 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Reset</button>
                  <button onClick={() => openEdit(timer)} className="btn-ghost flex-1 flex items-center justify-center gap-2"><Pencil className="w-4 h-4" /> Modify</button>
                </div>
                {(historyByTimer[timer.name]?.length ?? 0) > 0 && <p className="text-xs text-dim mt-3 flex items-center gap-1"><History className="w-3 h-3" /> {historyByTimer[timer.name].length} recorded changes</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-cinzel text-lg font-bold flex items-center gap-2 mb-4"><History className="w-5 h-5 text-gold" /> Recent Timer Activity</h2>
        {history.length === 0 ? <p className="text-sm text-dim">No timer changes yet.</p> : <div className="space-y-2">
          {history.slice(0, 20).map((entry) => {
            const name = (entry as TimerHistory & { boss_timers?: { name: string } }).boss_timers?.name ?? 'Unknown';
            return <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-soft/50 border border-clan-soft text-sm">
              <span className="text-gold font-medium">{name}</span>
              <span className="text-muted"> {entry.action} by <strong className="text-gold">{entry.changed_by_member?.in_game_name ?? 'Unknown'}</strong></span>
              <span className="text-xs text-dim ml-auto">{new Date(entry.created_at).toLocaleString()}</span>
            </div>;
          })}
        </div>}
      </div>

      {editing && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="card p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-5"><h2 className="font-cinzel text-lg font-bold">Modify {editing.name}</h2><button onClick={() => setEditing(null)}><X className="w-5 h-5 text-dim" /></button></div>
          <label className="block text-sm text-muted mb-2">Minutes until respawn<input type="number" min="0" step="1" value={remainingMinutes} onChange={(e) => setRemainingMinutes(e.target.value)} className="input-clan mt-1" /></label>
          <label className="block text-sm text-muted mb-5">Spawn window (minutes)<input type="number" min="0" step="1" value={windowMinutes} onChange={(e) => setWindowMinutes(e.target.value)} className="input-clan mt-1" /></label>
          <button onClick={saveTimer} disabled={saving} className="btn-gold w-full">{saving ? 'Saving...' : 'Save Timer'}</button>
        </div>
      </div>}
    </div>
  );
}
