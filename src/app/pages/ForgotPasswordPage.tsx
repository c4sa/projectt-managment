import React, { useState } from 'react';
import { Link } from 'react-router';
import { resetPasswordForEmail } from '../lib/authClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin;
  const redirectTo = `${siteUrl}/set-password`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await resetPasswordForEmail(email, redirectTo);
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle className="text-xl text-[#444545]">Reset Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">Email sent!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Check your inbox at <strong>{email}</strong> for a link to reset your password.
                  </p>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Didn't receive it? Check your spam folder or{' '}
                  <button
                    onClick={() => { setSent(false); setError(null); }}
                    className="text-[#7A1516] hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-[#7A1516] hover:underline">
                ← Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
