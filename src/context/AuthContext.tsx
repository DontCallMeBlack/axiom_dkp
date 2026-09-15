import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ClanMember } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  member: ClanMember | null;
  loading: boolean;
  isLeader: boolean;
  isOfficer: boolean;
  isLeaderOrOfficer: boolean;
  signUp: (email: string, password: string, inGameName: string, playerClass: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  requestOtp: (email: string, inGameName?: string, playerClass?: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string, inGameName?: string, playerClass?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<ClanMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('clan_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching member:', error.message);
      setMember(null);
      return;
    }
    setMember(data as ClanMember | null);
  }, []);

  const refreshMember = useCallback(async () => {
    if (user) {
      await fetchMember(user.id);
    }
  }, [user, fetchMember]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchMember(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchMember(session.user.id);
      } else {
        setMember(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchMember]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    inGameName: string,
    playerClass: string
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          in_game_name: inGameName,
          class: playerClass,
        },
      },
    });
    if (error) return { error: error.message };

    if (data.user && data.session) {
      await fetchMember(data.user.id);
    }

    return { error: null };
  }, [fetchMember]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const requestOtp = useCallback(async (
    email: string,
    inGameName?: string,
    playerClass?: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: inGameName && playerClass ? { in_game_name: inGameName, class: playerClass } : undefined,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyOtp = useCallback(async (
    email: string,
    token: string,
    inGameName?: string,
    playerClass?: string
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return { error: error.message };

    if (data.user && inGameName && playerClass) {
      const { error: memberError } = await supabase.rpc('update_my_clan_profile', {
        new_in_game_name: inGameName,
        new_class: playerClass,
      });
      if (memberError) return { error: memberError.message };
      await fetchMember(data.user.id);
    }

    return { error: null };
  }, [fetchMember]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMember(null);
  }, []);

  const isLeader = member?.role === 'leader';
  const isOfficer = member?.role === 'officer';
  const isLeaderOrOfficer = isLeader || isOfficer;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        member,
        loading,
        isLeader,
        isOfficer,
        isLeaderOrOfficer,
        signUp,
        signIn,
        requestOtp,
        verifyOtp,
        signOut,
        refreshMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
