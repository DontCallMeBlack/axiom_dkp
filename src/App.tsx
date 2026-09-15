import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { Layout, PageId } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Roster } from '@/pages/Roster';
import { DKP } from '@/pages/DKP';
import { Events } from '@/pages/Events';
import { Rules } from '@/pages/Rules';
import { Admin } from '@/pages/Admin';
import { Timers } from '@/pages/Timers';

function AppContent() {
  const { user, loading, member } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-celtic-pattern flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-celtic-pattern flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <p className="text-muted">Your account is not linked to a clan member profile. Please contact a clan officer.</p>
        </div>
      </div>
    );
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'roster' && <Roster />}
      {page === 'dkp' && <DKP />}
      {page === 'events' && <Events />}
      {page === 'timers' && <Timers />}
      {page === 'rules' && <Rules />}
      {page === 'admin' && <Admin />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
