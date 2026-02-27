import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabaseAuth, updatePassword, getSession } from '../lib/authClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

type PageState = 'loading' | 'ready' | 'success' | 'error';

export function SetPasswordPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<'invite' | 'recovery' | 'unknown'>('unknown');

  useEffect(() => {
    const hash = window.location.hash;
    const isInvite = hash.includes('type=invite');
    const isRecovery = hash.includes('type=recovery');

    // Step 1: Check if supabase-js already processed the hash and we have a session.
    // This happens when AuthContext initialised first and the SIGNED_IN event already fired.
    getSession().then(({ session }) => {
      if (!session) return; // no session yet — wait for the auth state change event below
      if (isInvite) {
        setLinkType('invite');
        setPageState('ready');
      } else if (isRecovery) {
        setLinkType('recovery');
        setPageState('ready');
      }
      // If neither flag is in the hash the user navigated here directly — do nothing,
      // let the timeout handle it.
    });

    // Step 2: Also listen for the auth state change event in case the hash hasn't
    // been processed yet when this component mounts.
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLinkType('recovery');
        setPageState('ready');
      } else if (event === 'SIGNED_IN' && isInvite) {
        setLinkType('invite');
        setPageState('ready');
      }
    });

    // Fallback: if no session and no event fires within 4s the link is invalid/used.
    const timer = setTimeout(() => {
      setPageState((prev) => {
        if (prev === 'loading') {
          setSessionError('This link is invalid or has already been used. Please request a new one.');
          return 'error';
        }
        return prev;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) throw new Error(err.message);
      setPageState('success');
      // Redirect to dashboard after 2s
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const title = linkType === 'invite' ? 'Set Your Password' : 'Choose a New Password';
  const description =
    linkType === 'invite'
      ? 'Welcome! Please set a password for your account to continue.'
      : 'Enter a new password for your account.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-sm">
        {/* Logo + branding */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Core Code" className="h-20 mb-4" />
          <h1 className="text-2xl font-bold text-[#444545]">Core Code</h1>
          <p className="text-sm text-gray-500 mt-1">Project Management System</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            {pageState === 'loading' && (
              <>
                <CardTitle className="text-xl text-[#444545]">Verifying link...</CardTitle>
                <CardDescription>Please wait while we verify your link.</CardDescription>
              </>
            )}
            {pageState === 'ready' && (
              <>
                <CardTitle className="text-xl text-[#444545]">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </>
            )}
            {pageState === 'success' && (
              <>
                <CardTitle className="text-xl text-[#444545]">Password Set!</CardTitle>
                <CardDescription>Redirecting you to the dashboard...</CardDescription>
              </>
            )}
            {pageState === 'error' && (
              <>
                <CardTitle className="text-xl text-[#444545]">Link Invalid</CardTitle>
                <CardDescription>This link cannot be used.</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {pageState === 'loading' && (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-4 border-[#7A1516] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {pageState === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Set Password'}
                </Button>
              </form>
            )}

            {pageState === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">Password saved successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  You will be redirected to the dashboard shortly.
                </p>
              </div>
            )}

            {pageState === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{sessionError}</p>
                </div>
                <div className="text-center space-y-2">
                  <a href="/forgot-password" className="block text-sm text-[#7A1516] hover:underline">
                    Request a new password reset link
                  </a>
                  <a href="/login" className="block text-sm text-gray-500 hover:underline">
                    Back to login
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
