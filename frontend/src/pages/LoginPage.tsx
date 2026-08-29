import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, KeyRound, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const maxTilt = 5;
    const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
    const rotateX = -(mouseY / (rect.height / 2)) * maxTilt;

    setTilt({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 [perspective:1000px]">
      <div className="animate-float-drift w-full max-w-md">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 120ms ease-out',
          }}
          className="relative max-w-md w-full perforated-ticket p-8 shadow-2xl rounded-xs"
        >
          {/* Perforated Edge Shimmer Overlays */}
          <div className="perforated-shimmer-top">
            <div className="perforated-shimmer-bar" />
          </div>
          <div className="perforated-shimmer-bottom">
            <div className="perforated-shimmer-bar" />
          </div>

          <div className="text-center mb-6">
            <div className="font-stencil text-2xl uppercase tracking-widest text-[#1E2A38]">
              Manifest Access Authentication
            </div>
            <div className="font-mono text-xs text-slate-600 mt-1">
              Last-Mile Logistics System Login
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-[#B4432E]/10 border border-[#B4432E] text-[#B4432E] text-xs font-mono p-3 rounded-xs flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-1 text-[#1E2A38]">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="manifest-input w-full bg-[#E6DEC8]/40 border-2 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-mono text-xs font-bold uppercase text-[#1E2A38]">
                  Password
                </label>
                <Link to="/forgot-password" className="font-mono text-xs text-[#1E2A38] hover:underline font-semibold">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="manifest-input w-full bg-[#E6DEC8]/40 border-2 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="stamp-btn cursor-stamp w-full bg-[#1E2A38] text-paper font-mono font-bold text-sm uppercase py-2.5 rounded-xs shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Authenticate Ticket'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-[#1E2A38]/20 pt-4">
            <span className="font-mono text-xs text-slate-600">Need a Customer Account? </span>
            <Link to="/register" className="font-mono text-xs font-bold text-[#1E2A38] underline">
              Register Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

