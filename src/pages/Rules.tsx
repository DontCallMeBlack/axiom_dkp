import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClanRule, RuleCategory } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ScrollText, Plus, X, Edit3, Trash2, Save } from 'lucide-react';

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  general: 'General',
  dkp: 'DKP System',
  raid: 'Raid Rules',
  conduct: 'Code of Conduct',
  ranking: 'Rank Structure',
};

const CATEGORY_COLORS: Record<RuleCategory, string> = {
  general: 'text-stone-300 bg-stone-400/10 border-stone-400/30',
  dkp: 'text-gold bg-amber-500/10 border-amber-500/30',
  raid: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  conduct: 'text-crimson-bright bg-crimson/10 border-crimson/30',
  ranking: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

export function Rules() {
  const { isLeaderOrOfficer } = useAuth();
  const [rules, setRules] = useState<ClanRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ClanRule | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' as RuleCategory, display_order: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rules')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    setRules(data as ClanRule[] ?? []);
    setLoading(false);
  };

  const startCreate = () => {
    setEditingRule(null);
    setForm({ title: '', content: '', category: 'general', display_order: rules.length + 1 });
    setShowForm(true);
  };

  const startEdit = (rule: ClanRule) => {
    setEditingRule(rule);
    setForm({ title: rule.title, content: rule.content, category: rule.category, display_order: rule.display_order });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.content.trim()) { setError('Content is required.'); return; }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      display_order: form.display_order,
    };

    if (editingRule) {
      const { error } = await supabase.from('rules').update(payload).eq('id', editingRule.id);
      if (error) { setError(error.message); return; }
    } else {
      const { error } = await supabase.from('rules').insert(payload);
      if (error) { setError(error.message); return; }
    }

    setShowForm(false);
    setEditingRule(null);
    fetchRules();
  };

  const handleDelete = async (rule: ClanRule) => {
    if (!confirm(`Delete "${rule.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('rules').delete().eq('id', rule.id);
    if (error) { alert(error.message); return; }
    fetchRules();
  };

  const grouped: Record<string, ClanRule[]> = {};
  rules.forEach((r) => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  const categoryOrder: RuleCategory[] = ['general', 'ranking', 'dkp', 'raid', 'conduct'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-bold">Clan Rules</h1>
            <p className="text-sm text-muted">{rules.length} rules across {Object.keys(grouped).length} categories</p>
          </div>
        </div>
        {isLeaderOrOfficer && (
          <button onClick={startCreate} className="btn-gold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        )}
      </div>

      {loading && <p className="text-center text-dim py-8">Loading rules...</p>}

      {!loading && rules.length === 0 && (
        <div className="card p-12 text-center">
          <ScrollText className="w-12 h-12 text-dim mx-auto mb-3" />
          <p className="text-muted">No rules have been set yet</p>
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="space-y-8">
          {categoryOrder.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <div className="ornament mb-4">
                <h2 className="font-cinzel text-sm font-bold uppercase tracking-wider text-gold-dim">
                  {CATEGORY_LABELS[cat]}
                </h2>
              </div>
              <div className="space-y-3">
                {grouped[cat].map((rule) => (
                  <div key={rule.id} className="card p-5 card-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-cinzel text-base font-bold">{rule.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[rule.category]}`}>
                            {CATEGORY_LABELS[rule.category]}
                          </span>
                        </div>
                        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{rule.content}</p>
                      </div>
                      {isLeaderOrOfficer && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(rule)}
                            className="p-2 rounded-lg hover:bg-clan transition-colors text-muted hover:text-gold"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-2 rounded-lg hover:bg-clan transition-colors text-muted hover:text-crimson-bright"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cinzel text-lg font-bold">{editingRule ? 'Edit Rule' : 'Add Rule'}</h3>
              <button onClick={() => setShowForm(false)} className="text-dim hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Title</label>
                <input
                  type="text"
                  placeholder="Rule title..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-clan"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as RuleCategory })}
                  className="input-clan cursor-pointer"
                >
                  {(Object.keys(CATEGORY_LABELS) as RuleCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Content</label>
                <textarea
                  placeholder="Write the rule details..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input-clan min-h-[120px] resize-y"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  className="input-clan"
                />
                <p className="text-xs text-dim mt-1">Lower numbers appear first</p>
              </div>
              {error && (
                <div className="text-sm text-crimson-bright bg-crimson/10 border border-crimson/30 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="btn-gold flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {editingRule ? 'Save Changes' : 'Add Rule'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
