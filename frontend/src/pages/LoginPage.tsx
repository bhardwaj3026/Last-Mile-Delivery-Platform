import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, KeyRound, Mail } from 'lucide-react';
import { StatusStamp } from '../components/StatusStamp';
import { CatMascot } from '../components/CatMascot';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Motion & submission state
  const [stampState, setStampState] = useState<'none' | 'success' | 'failed'>('none');
  const [stampFadingOut, setStampFadingOut] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      if (isSubmitting || stampState !== 'none') return;
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
    },
    [isSubmitting, stampState]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setTilt({ x: 0, y: 0 });

    try {
      const authenticatedUser = await login(email, password);

      // 1. Show hero ACCESS GRANTED stamp
      setStampState('success');

      // 2. Hold stamp visible for ~450ms
      await new Promise(resolve => setTimeout(resolve, 450));

      // 3. Fade + scale down login card (~250ms)
      setIsFadingOut(true);
      await new Promise(resolve => setTimeout(resolve, 250));

      // 4. Navigate to correct dashboard route based on user role
      if (authenticatedUser.role === 'ADMIN') {
        navigate('/admin');
      } else if (authenticatedUser.role === 'AGENT') {
        navigate('/agent');
      } else {
        navigate('/customer');
      }
    } catch (err: any) {
      // 1. Show hero ACCESS DENIED stamp
      setStampState('failed');

      // 2. Trigger horizontal card shake (~300ms)
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);

      // 3. Hold denied stamp for ~1s, then fade out
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStampFadingOut(true);
      await new Promise(resolve => setTimeout(resolve, 200));

      setStampState('none');
      setStampFadingOut(false);
      setError(err.message || 'Login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 [perspective:1000px]">
      <div className={`animate-float-drift w-full max-w-md ${isFadingOut ? 'login-card-exit' : ''}`}>
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: isFadingOut
              ? 'scale(0.97)'
              : `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 120ms ease-out',
          }}
          className={`relative max-w-md w-full perforated-ticket p-8 shadow-2xl rounded-xs ${
            isShaking ? 'animate-card-shake' : ''
          }`}
        >
          {/* Original Cartoon Cat Mascot with Cursor-Tracking Eyes */}
          <CatMascot />

          {/* Hero Stamp Submission Overlay */}
          {stampState !== 'none' && (
            <div
              className={`absolute inset-0 flex items-center justify-center z-30 bg-[#F8F5EE]/65 backdrop-blur-[1px] rounded-xs ${
                stampFadingOut ? 'stamp-fade-out' : ''
              }`}
            >
              {stampState === 'success' ? (
                <StatusStamp status="DELIVERED" label="ACCESS GRANTED" size="hero" animate={true} />
              ) : (
                <StatusStamp status="FAILED" label="ACCESS DENIED" size="hero" animate={true} />
              )}
            </div>
          )}

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
                  disabled={isSubmitting}
                  className="manifest-input w-full bg-[#E6DEC8]/40 border-2 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none disabled:opacity-50"
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
                  disabled={isSubmitting}
                  className="manifest-input w-full bg-[#E6DEC8]/40 border-2 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 bg-[#B4432E]/10 border border-[#B4432E] text-[#B4432E] text-xs font-mono p-3 rounded-xs flex items-center">
                <AlertCircle size={16} className="mr-2 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="stamp-btn cursor-stamp w-full bg-[#1E2A38] text-paper font-mono font-bold text-sm uppercase py-2.5 rounded-xs shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmitting
                ? stampState === 'success'
                  ? 'Access Granted'
                  : stampState === 'failed'
                  ? 'Access Denied'
                  : 'Authenticating...'
                : 'Authenticate Ticket'}
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


