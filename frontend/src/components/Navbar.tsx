import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-ink text-paper border-b-4 border-stamp-amber shadow-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="bg-stamp-amber text-ink p-2 rounded-xs font-bold shadow-xs group-hover:scale-105 transition-transform">
            <Package size={20} />
          </div>
          <div>
            <div className="font-stencil text-xl uppercase tracking-widest leading-none text-paper">
              LASTMILE
            </div>
            <div className="font-mono text-[10px] tracking-wider text-stamp-amber uppercase">
              Manifest & Logistics Portal
            </div>
          </div>
        </div>

        {/* User Info & Actions & Theme Toggle */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center space-x-3">
              {/* Role Badge */}
              <div className="flex items-center space-x-2 bg-paper/10 px-3 py-1 rounded border border-paper/20">
                <span className="font-mono text-xs text-paper/80">{user.name}</span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs ${
                    user.role === 'ADMIN'
                      ? 'bg-stamp-red text-paper'
                      : user.role === 'AGENT'
                      ? 'bg-stamp-amber text-ink'
                      : 'bg-stamp-green text-paper'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={() => logout()}
                className="p-1.5 text-paper/80 hover:text-paper hover:bg-paper/10 rounded flex items-center space-x-1 font-mono text-xs"
                title="Logout"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="font-mono text-xs text-paper hover:text-stamp-amber"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="font-mono text-xs bg-stamp-amber text-ink px-3 py-1.5 font-bold uppercase rounded-xs hover:opacity-90"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

