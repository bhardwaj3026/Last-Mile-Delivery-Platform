import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { KeyRound, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full perforated-ticket p-8 shadow-2xl rounded-xs">
        <div className="text-center mb-6">
          <div className="font-stencil text-2xl uppercase tracking-widest text-[#1E2A38] flex items-center justify-center">
            <ShieldCheck size={24} className="mr-2 text-[#2E6B4F]" /> Reset Password Confirmation
          </div>
          <div className="font-mono text-xs text-slate-600 mt-1">
            Set a new secure password for your account
          </div>
        </div>

        {!token && (
          <div className="mb-4 bg-[#B4432E]/10 border border-[#B4432E] text-[#B4432E] text-xs font-mono p-3 rounded-xs flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            Invalid or missing password reset token in URL parameters.
          </div>
        )}

        {error && (
          <div className="mb-4 bg-[#B4432E]/10 border border-[#B4432E] text-[#B4432E] text-xs font-mono p-3 rounded-xs flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="bg-[#2E6B4F]/10 border border-[#2E6B4F] text-[#2E6B4F] text-xs font-mono p-4 rounded-xs">
              <CheckCircle2 size={24} className="mx-auto mb-2" />
              <div className="font-bold text-sm">Password Reset Successful!</div>
              <div className="mt-1">Your password has been updated. You can now log in to your account.</div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#1E2A38] text-paper font-mono font-bold text-sm uppercase py-2.5 rounded-xs hover:bg-slate-800 transition-colors shadow-md"
            >
              Proceed to Login Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-1 text-[#1E2A38]">
                New Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#E6DEC8]/40 border-2 border-[#1E2A38] pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:ring-2 focus:ring-[#1E2A38]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-1 text-[#1E2A38]">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#E6DEC8]/40 border-2 border-[#1E2A38] pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:ring-2 focus:ring-[#1E2A38]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full bg-[#1E2A38] text-paper font-mono font-bold text-sm uppercase py-2.5 rounded-xs hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Updating Password...' : 'Confirm & Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
