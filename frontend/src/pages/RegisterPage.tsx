import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, User, Mail, KeyRound, Phone } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await register(name, email, password, phone);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full perforated-ticket p-8 shadow-2xl rounded-xs">
        <div className="text-center mb-6">
          <div className="font-stencil text-2xl uppercase tracking-widest text-ink">
            Customer Registration Ticket
          </div>
          <div className="font-mono text-xs text-ink/70 mt-1">
            Create account for placing & tracking deliveries
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-stamp-red/10 border border-stamp-red text-stamp-red text-xs font-mono p-3 rounded-xs flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-1 text-ink">
              Full Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-ink/50" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Bhardwaj munishekar"
                className="w-full bg-paper/50 text-ink border-2 border-ink/40 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:border-ink"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-1 text-ink">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-ink/50" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-paper/50 text-ink border-2 border-ink/40 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:border-ink"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-1 text-ink">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3 text-ink/50" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+15551234567"
                className="w-full bg-paper/50 text-ink border-2 border-ink/40 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:border-ink"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-1 text-ink">
              Password
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3 text-ink/50" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-paper/50 text-ink border-2 border-ink/40 pl-10 pr-3 py-2 font-mono text-sm rounded-xs focus:outline-none focus:border-ink"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ink text-paper font-mono font-bold text-sm uppercase py-2.5 rounded-xs hover:opacity-90 transition-colors shadow-md disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Registering...' : 'Create Customer Account'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-ink/20 pt-4">
          <span className="font-mono text-xs text-ink/70">Already registered? </span>
          <Link to="/login" className="font-mono text-xs font-bold text-ink underline">
            Login to Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
