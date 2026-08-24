import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { Mail, AlertCircle, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoResetLink, setDemoResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    setDemoResetLink(null);

    try {
      const res = await fetchApi<{ message: string; resetLink?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setSuccessMsg(res.message);
      if (res.resetLink) {
        setDemoResetLink(res.resetLink);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full perforated-ticket p-8 shadow-2xl rounded-xs">
        <div className="text-center mb-6">
          <div className="font-stencil text-2xl uppercase tracking-widest text-[#1E2A38] flex items-center justify-center">
            <KeyRound size={22} className="mr-2 text-[#C68A2E]" /> Password Recovery Ticket
          </div>
          <div className="font-mono text-xs text-slate-600 mt-1">
            Request a password reset link for Customer or Agent account
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-[#B4432E]/10 border border-[#B4432E] text-[#B4432E] text-xs font-mono p-3 rounded-xs flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="space-y-4">
            <div className="bg-[#2E6B4F]/10 border border-[#2E6B4F] text-[#2E6B4F] text-xs font-mono p-4 rounded-xs">
              <div className="flex items-center font-bold mb-1">
                <CheckCircle2 size={16} className="mr-2 shrink-0" /> Reset Instructions Dispatched
              </div>
              <div>{successMsg}</div>
            </div>

            {demoResetLink && (
              <div className="bg-[#E6DEC8] border border-[#1E2A38] p-3 rounded-xs text-xs font-mono">
                <div className="font-bold text-[#1E2A38] mb-1 uppercase text-[10px]">
                  Password Reset Link:
                </div>
                <a
                  href={demoResetLink}
                  className="text-blue-800 underline break-all font-semibold"
                >
                  Click Here to Reset Password Now
                </a>
              </div>
            )}

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="font-mono text-xs font-bold text-[#1E2A38] hover:text-[#C68A2E] inline-flex items-center"
              >
                <ArrowLeft size={14} className="mr-1" /> Return to Login Portal
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-1 text-[#1E2A38]">
                Account Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-[#E6DEC8]/40 border-2 border-[#1E2A38] pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:ring-2 focus:ring-[#1E2A38]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1E2A38] text-paper font-mono font-bold text-sm uppercase py-2.5 rounded-xs hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Sending Request...' : 'Send Password Reset Ticket'}
            </button>

            <div className="pt-4 text-center border-t border-[#1E2A38]/20">
              <Link
                to="/login"
                className="font-mono text-xs text-slate-600 hover:text-[#1E2A38] inline-flex items-center"
              >
                <ArrowLeft size={14} className="mr-1" /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
