// src/auth/providers/AuthProvider.jsx

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { AuthContext } from '../contexts/auth-context';

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
        setSession(s);
        if (s?.user) {
          // Updated to use profiles_v1 with correct column names
          await supabase
            .from('profiles_v1')
            .upsert({ profile_id: s.user.id }, { onConflict: 'profile_id' });
        }
      });
      setReady(true);
      return () => sub.subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []);

  const continueWithEmail = async (email, password) => {
    // try sign in
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return;

    const msg = (error?.message || '').toLowerCase();

    // weak password or provider disabled give 400s
    if (msg.includes('weak') || msg.includes('disabled')) throw error;

    // attempt sign up
    const { data: suData, error: suErr } = await supabase.auth.signUp({ email, password });
    if (suErr) {
      if (suErr.message.toLowerCase().includes('already registered')) {
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) throw e2;
        return;
      }
      throw suErr;
    }
    if (!suData.session) throw new Error('Account created. Check your email to confirm, then log in.');
  };

  const requestPasswordReset = async (email, redirectTo) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const setNewPassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const value = useMemo(
    () => ({ user: session?.user ?? null, ready, continueWithEmail, requestPasswordReset, setNewPassword, logout }),
    [session, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
