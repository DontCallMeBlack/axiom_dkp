import { ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, ClanRole } from '@/types';
import {
  LayoutDashboard,
  Users,
  Trophy,
  CalendarDays,
  ScrollText,
  Shield,
  Timer,
  Menu,
  X,
  LogOut,
  Crown,
} from 'lucide-react';

export type PageId = 'dashboard' | 'roster' | 'dkp' | 'events' | 'timers' | 'rules' | 'admin';

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard; officerOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'dkp', label: 'DKP Standings', icon: Trophy },
  { id: 'events', label: 'Events & Raids', icon: CalendarDays },
  { id: 'timers', label: 'Boss Timers', icon: Timer },
  { id: 'rules', label: 'Clan Rules', icon: ScrollText },
  { id: 'admin', label: 'Admin Panel', icon: Shield, officerOnly: true },
];

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { member, signOut, isLeaderOrOfficer } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => !item.officerOnly || isLeaderOrOfficer);

  const role = (member?.role ?? 'recruit') as ClanRole;
  const roleColorClass = ROLE_COLORS[role];

  return (
    <div className="min-h-screen bg-celtic-pattern flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-clan bg-soft/50 backdrop-blur-sm">
        <div className="p-6 border-b border-clan-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-600/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h1 className="font-cinzel text-lg font-bold text-gold-bright leading-tight">Clan Hall</h1>
              <p className="text-xs text-dim">Celtic Heroes</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-link w-full text-left ${currentPage === item.id ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-clan-soft">
          <div className="card p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-clan flex items-center justify-center text-sm font-cinzel font-bold text-gold">
                {member?.in_game_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member?.in_game_name ?? 'Unknown'}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded border ${roleColorClass}`}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </div>
            <button
              onClick={signOut}
              className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-dim hover:text-crimson-bright transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-soft border-b border-clan px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold" />
          <span className="font-cinzel font-bold text-gold-bright">Clan Hall</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-clan transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-14 bottom-0 w-72 bg-soft border-l border-clan p-4 space-y-1 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileOpen(false);
                  }}
                  className={`nav-link w-full text-left ${currentPage === item.id ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            <div className="pt-4 mt-4 border-t border-clan-soft">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-clan flex items-center justify-center text-sm font-cinzel font-bold text-gold">
                  {member?.in_game_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{member?.in_game_name}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded border ${roleColorClass}`}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
              </div>
              <button
                onClick={signOut}
                className="nav-link w-full text-left mt-2 text-crimson-bright"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
