import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ session: null, loading: Boolean(supabase), error: '' });
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, loading: false, error: '' });
    });
    supabase.auth.getSession().then(({ error }) => {
      if (active && error) setState({ session: null, loading: false, error: error.message });
    }).catch((error) => { if (active) setState({ session: null, loading: false, error: error.message }); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  return <AuthContext.Provider value={{ ...state, user: state.session?.user ?? null, configured: Boolean(supabase), signOut }}>{children}</AuthContext.Provider>;
}
