import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  getSupabaseClient,
  getSupabaseCredentials,
  saveSupabaseCredentials
} from '../../lib/supabase';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  LogOut,
  RefreshCw,
  Key,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function AuthModal({ isOpen, onClose, onSyncSuccess }) {
  const [credentials, setCredentials] = useState(getSupabaseCredentials());
  const [supabaseUrl, setSupabaseUrl] = useState(credentials.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(credentials.anonKey || '');
  const [isConfiguringKeys, setIsConfiguringKeys] = useState(!credentials.url);

  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check auth state whenever modal opens or credentials change
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setCredentials(creds);
    setSupabaseUrl(creds.url);
    setSupabaseAnonKey(creds.anonKey);

    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data: { user } }) => {
        setCurrentUser(user || null);
      }).catch(() => {
        setCurrentUser(null);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });

      return () => subscription?.unsubscribe();
    } else {
      setCurrentUser(null);
    }
  }, [isOpen]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both Supabase URL and Anon Key.' });
      return;
    }

    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    const client = getSupabaseClient();
    if (!client) {
      setStatusMessage({ type: 'error', text: 'Invalid URL or Key format.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      // Test ping
      const { error } = await client.auth.getSession();
      if (error) throw error;
      setCredentials(getSupabaseCredentials());
      setIsConfiguringKeys(false);
      setStatusMessage({ type: 'success', text: 'Connected to Supabase! You can now sign in or create an account.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to connect to Supabase.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const client = getSupabaseClient();
    if (!client) {
      setIsConfiguringKeys(true);
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (authMode === 'signin') {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        setCurrentUser(data.user);
        setStatusMessage({ type: 'success', text: 'Signed in successfully! Cloud sync active.' });
        if (onSyncSuccess) onSyncSuccess();
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;
        setCurrentUser(data.user);
        setStatusMessage({
          type: 'success',
          text: data.session ? 'Account created and signed in!' : 'Confirmation link sent to your email! Verify and log in.'
        });
        if (data.session && onSyncSuccess) onSyncSuccess();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsConfiguringKeys(true);
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Google sign in failed.' });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {

    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    try {
      await client.auth.signOut();
      setCurrentUser(null);
      setStatusMessage({ type: 'success', text: 'Signed out. Kurama is now in local-only mode.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!onSyncSuccess) return;
    setIsSyncing(true);
    try {
      await onSyncSuccess();
      setStatusMessage({ type: 'success', text: 'Synced all notes and words with Supabase!' });
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Sync failed: ' + (err.message || 'Check connection') });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cloud Sync & Account" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Supabase Connection Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border-dark bg-[#0A101F]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              currentUser
                ? 'bg-[#00B4FF] text-black shadow-glow-sm'
                : credentials.url
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{currentUser ? 'Cloud Sync Active' : credentials.url ? 'Supabase Connected' : 'Local-First Mode'}</span>
                {currentUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <div className="text-[11px] text-[#8295B0]">
                {currentUser
                  ? currentUser.email
                  : credentials.url
                    ? 'Ready for login'
                    : 'Stored in browser only'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConfiguringKeys(!isConfiguringKeys)}
            className="text-[11px] font-semibold text-[#00B4FF] hover:underline"
          >
            {isConfiguringKeys ? 'Cancel' : 'Change Project'}
          </button>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
              : 'bg-red-950/40 text-red-300 border border-red-800'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Credentials Form (When editing URL / Key) */}
        {isConfiguringKeys && (
          <form onSubmit={handleSaveConfig} className="space-y-3 p-3.5 rounded-xl border border-border-dark bg-surface-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#00B4FF]" />
                <span>Supabase API Credentials</span>
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#00B4FF] hover:underline inline-flex items-center gap-0.5"
              >
                Open Dashboard <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Anon Public Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF] font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow-sm disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Save & Connect Project'}
              </button>
            </div>
          </form>
        )}

        {/* Authenticated View: When User is logged in */}
        {currentUser && !isConfiguringKeys && (
          <div className="space-y-3.5 p-4 rounded-xl border border-border-dark bg-[#0A101F]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#00B4FF]">
                  Connected Account
                </span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {currentUser.email}
                </p>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>

            <div className="pt-2 border-t border-[#1A2744] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow-sm disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-dark text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Unauthenticated View: Sign In / Sign Up */}
        {!currentUser && !isConfiguringKeys && (
          <div className="space-y-4">
            <div className="flex border-b border-border-dark text-xs">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 pb-2 font-bold transition-all ${
                  authMode === 'signin'
                    ? 'text-[#00B4FF] border-b-2 border-[#00B4FF]'
                    : 'text-[#8295B0] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 pb-2 font-bold transition-all ${
                  authMode === 'signup'
                    ? 'text-[#00B4FF] border-b-2 border-[#00B4FF]'
                    : 'text-[#8295B0] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-border-dark bg-[#0E1528] hover:bg-[#131D38] text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-border-dark"></div>
              <span className="shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-[#8295B0]">
                or with email
              </span>
              <div className="grow border-t border-border-dark"></div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{authMode === 'signin' ? 'Sign In to Sync' : 'Create Free Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-border-dark text-[#8295B0] hover:text-white hover:bg-surface-dark transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-3 rounded-lg border border-[#1A2744] bg-[#0A101F]/60 text-[11px] text-[#8295B0] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00B4FF] shrink-0" />
          <span>
            {currentUser
              ? 'Your notes and vocabulary words sync automatically between your devices.'
              : 'You can use Kurama offline as a Guest anytime. Signing in backs up your data to the cloud.'}
          </span>
        </div>
      </div>
    </Modal>
  );
}
