import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClanEvent, EventStatus, ClanMember, EventAttendance } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, Plus, X, Trophy, Check, Clock, MapPin, Users, ChevronRight, Edit3 } from 'lucide-react';

export function Events() {
  const { isLeaderOrOfficer } = useAuth();
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClanEvent | null>(null);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', dkp_reward: 10, status: 'scheduled' as EventStatus });
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, EventAttendance[]>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });
    setEvents(data as ClanEvent[] ?? []);

    const { data: m } = await supabase
      .from('clan_members')
      .select('*')
      .eq('status', 'active')
      .order('in_game_name', { ascending: true });
    setMembers(m as ClanMember[] ?? []);
    setLoading(false);
  };

  const fetchAttendance = async (eventId: string) => {
    const { data } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', eventId);
    setAttendance((prev) => ({ ...prev, [eventId]: data as EventAttendance[] ?? [] }));
  };

  const toggleExpand = (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
      fetchAttendance(eventId);
    }
  };

  const startCreate = () => {
    setEditingEvent(null);
    setForm({ title: '', description: '', event_date: '', dkp_reward: 10, status: 'scheduled' });
    setShowForm(true);
  };

  const startEdit = (ev: ClanEvent) => {
    setEditingEvent(ev);
    const date = new Date(ev.event_date);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ title: ev.title, description: ev.description ?? '', event_date: localDate, dkp_reward: ev.dkp_reward, status: ev.status });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.event_date) { setError('Date is required.'); return; }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: new Date(form.event_date).toISOString(),
      dkp_reward: form.dkp_reward,
      status: form.status,
    };

    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
      if (error) { setError(error.message); return; }
    } else {
      const { error } = await supabase.from('events').insert(payload);
      if (error) { setError(error.message); return; }
    }

    setShowForm(false);
    setEditingEvent(null);
    fetchEvents();
  };

  const toggleAttendance = async (eventId: string, memberId: string, memberName: string) => {
    const existing = (attendance[eventId] ?? []).find((a) => a.member_id === memberId);
    const event = events.find((e) => e.id === eventId);
    const dkp = event?.dkp_reward ?? 0;

    if (existing) {
      const newAttended = !existing.attended;
      const { error } = await supabase
        .from('event_attendance')
        .update({ attended: newAttended, dkp_awarded: newAttended ? dkp : 0 })
        .eq('id', existing.id);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supabase
        .from('event_attendance')
        .insert({ event_id: eventId, member_id: memberId, attended: true, dkp_awarded: dkp });
      if (error) { alert(error.message); return; }
    }
    fetchAttendance(eventId);
  };

  const updateEventStatus = async (eventId: string, status: EventStatus) => {
    const { error } = await supabase.from('events').update({ status }).eq('id', eventId);
    if (error) { alert(error.message); return; }
    fetchEvents();
  };

  const statusColors: Record<EventStatus, string> = {
    scheduled: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
    completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    cancelled: 'text-crimson-bright bg-crimson/10 border-crimson/30',
  };

  const upcoming = events.filter((e) => e.status === 'scheduled' && new Date(e.event_date) >= new Date());
  const past = events.filter((e) => e.status === 'completed' || new Date(e.event_date) < new Date());
  const cancelled = events.filter((e) => e.status === 'cancelled');

  const renderEvent = (ev: ClanEvent) => {
    const date = new Date(ev.event_date);
    const isExpanded = expandedEvent === ev.id;
    const eventAttendance = attendance[ev.id] ?? [];
    const attendedCount = eventAttendance.filter((a) => a.attended).length;

    return (
      <div key={ev.id} className="card card-hover overflow-hidden">
        <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => toggleExpand(ev.id)}>
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-soft border border-clan flex-shrink-0">
            <span className="text-xs text-dim">{date.toLocaleString('en-US', { month: 'short' })}</span>
            <span className="text-xl font-cinzel font-bold text-gold">{date.getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-cinzel text-base font-bold truncate">{ev.title}</h3>
              <span className={`text-xs px-2 py-1 rounded border flex-shrink-0 ${statusColors[ev.status]}`}>
                {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
              </span>
            </div>
            {ev.description && <p className="text-sm text-muted mt-1 line-clamp-2">{ev.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-dim">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              {ev.dkp_reward > 0 && <span className="flex items-center gap-1 text-gold"><Trophy className="w-3 h-3" /> +{ev.dkp_reward} DKP</span>}
              {isExpanded && attendedCount > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {attendedCount} attended</span>}
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-dim transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
        </div>

        {isExpanded && (
          <div className="border-t border-clan-soft p-4 bg-soft/30 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-muted" /> Attendance</h4>
              {isLeaderOrOfficer && ev.status === 'scheduled' && (
                <button
                  onClick={() => updateEventStatus(ev.id, 'completed')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark Complete
                </button>
              )}
              {isLeaderOrOfficer && (
                <button
                  onClick={() => startEdit(ev)}
                  className="text-xs text-muted hover:text-gold flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            {isLeaderOrOfficer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => {
                  const att = eventAttendance.find((a) => a.member_id === m.id);
                  const isAttended = att?.attended ?? false;
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleAttendance(ev.id, m.id, m.in_game_name)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${
                        isAttended
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-soft border-clan text-muted hover:border-clan'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        isAttended ? 'bg-emerald-500/20 border-emerald-500/40' : 'border-clan'
                      }`}>
                        {isAttended && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm truncate">{m.in_game_name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                {attendedCount === 0 ? (
                  <p className="text-sm text-dim text-center py-3">No attendance recorded yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {eventAttendance.filter((a) => a.attended).map((a) => {
                      const m = members.find((mem) => mem.id === a.member_id);
                      return (
                        <span key={a.id} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {m?.in_game_name ?? 'Unknown'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-bold">Events & Raids</h1>
            <p className="text-sm text-muted">{upcoming.length} upcoming · {past.length} past</p>
          </div>
        </div>
        {isLeaderOrOfficer && (
          <button onClick={startCreate} className="btn-gold flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Event
          </button>
        )}
      </div>

      {loading && <p className="text-center text-dim py-8">Loading events...</p>}

      {!loading && upcoming.length > 0 && (
        <div>
          <h2 className="font-cinzel text-sm font-bold text-muted uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="space-y-3">{upcoming.map(renderEvent)}</div>
        </div>
      )}

      {!loading && past.length > 0 && (
        <div>
          <h2 className="font-cinzel text-sm font-bold text-muted uppercase tracking-wider mb-3">Past Events</h2>
          <div className="space-y-3">{past.map(renderEvent)}</div>
        </div>
      )}

      {!loading && cancelled.length > 0 && (
        <div>
          <h2 className="font-cinzel text-sm font-bold text-muted uppercase tracking-wider mb-3">Cancelled</h2>
          <div className="space-y-3 opacity-60">{cancelled.map(renderEvent)}</div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="card p-12 text-center">
          <CalendarDays className="w-12 h-12 text-dim mx-auto mb-3" />
          <p className="text-muted">No events scheduled yet</p>
          {isLeaderOrOfficer && <p className="text-xs text-dim mt-1">Create one to get started</p>}
        </div>
      )}

      {/* Event form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cinzel text-lg font-bold">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowForm(false)} className="text-dim hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dragon Raid, Boss Fight..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-clan"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Description</label>
                <textarea
                  placeholder="Details about the event..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-clan min-h-[80px] resize-y"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  className="input-clan cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">DKP Reward</label>
                <input
                  type="number"
                  min={0}
                  value={form.dkp_reward}
                  onChange={(e) => setForm({ ...form, dkp_reward: parseInt(e.target.value) || 0 })}
                  className="input-clan"
                />
              </div>
              {editingEvent && (
                <div>
                  <label className="block text-xs text-muted mb-1.5 font-medium">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
                    className="input-clan cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
              {error && (
                <div className="text-sm text-crimson-bright bg-crimson/10 border border-crimson/30 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="btn-gold flex-1">{editingEvent ? 'Save Changes' : 'Create Event'}</button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
