import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CLASSES } from '@/types';
import { Crown, Mail, Lock, User, Swords, ChevronRight } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp, submitJoinRequest } = useAuth();
  const [mode, setMode] = useState<'signin' | 'request' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [playerClass, setPlayerClass] = useState(CLASSES[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else if (mode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) setError(error);
      else setError('Account created. If your request was approved, you can now enter the Hall.');
    } else {
      if (inGameName.trim().length < 2) {
        setError('In-game name must be at least 2 characters.');
        setLoading(false);
        return;
      }
      const { error } = await submitJoinRequest(email, inGameName.trim(), playerClass);
      if (error) setError(error);
      else setError('Request submitted. A clan administrator must approve it before you can create an account.');
    }
    setLoading(false);
  };

  const selectMode = (nextMode: 'signin' | 'request' | 'signup') => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-celtic-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/5 border border-amber-600/30 mb-4">
            <Crown className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-cinzel text-3xl font-bold text-gold-bright text-shadow-gold">Clan Hall</h1>
          <p className="text-sm text-muted mt-2">Celtic Heroes Clan Management</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-soft rounded-lg mb-6">
            <button
              onClick={() => selectMode('signin')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-card text-gold border border-amber-600/30'
                  : 'text-muted hover:text-text'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => selectMode('request')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'request'
                  ? 'bg-card text-gold border border-amber-600/30'
                  : 'text-muted hover:text-text'
              }`}
            >
              Request to Join
            </button>
          </div>
          <button
            type="button"
            onClick={() => selectMode('signup')}
            className={`w-full py-2.5 rounded-md text-sm font-medium transition-all mb-6 ${
              mode === 'signup' ? 'bg-card text-gold border border-amber-600/30' : 'text-muted hover:text-text'
            }`}
          >
            Create approved account
          </button>
          {(mode === 'request' || mode === 'signup') && (
            <p className="text-xs text-muted text-center -mt-3 mb-5">
              {mode === 'request'
                ? 'Submit your details for administrator approval.'
                : 'Only use this after an administrator approves your join request.'}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'request' && (
              <>
                <div>
                    <label className="block text-xs text-muted mb-1.5 font-medium">In-Game Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                      <input
                        type="text"
                        value={inGameName}
                        onChange={(e) => setInGameName(e.target.value)}
                        placeholder="Your character name"
                        required
                        className="input-clan pl-10"
                      />
                    </div>
                  </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5 font-medium">Class</label>
                  <div className="relative">
                    <Swords className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                    <select
                      value={playerClass}
                      onChange={(e) => setPlayerClass(e.target.value)}
                      className="input-clan pl-10 appearance-none cursor-pointer"
                    >
                      {CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-muted mb-1.5 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-clan pl-10"
                />
              </div>
            </div>

            {(mode === 'signin' || mode === 'signup') && <div>
              <label className="block text-xs text-muted mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="input-clan pl-10"
                />
              </div>
            </div>}

            {error && (
              <div className="text-sm text-crimson-bright bg-crimson/10 border border-crimson/30 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Enter the Hall' : mode === 'request' ? 'Submit Join Request' : 'Create Account'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-dim text-center mt-4">
              New members join as Recruits. An Officer will promote you.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-dim mt-6">
          Celtic Heroes Clan Management System
        </p>
      </div>
    </div>
  );
}
