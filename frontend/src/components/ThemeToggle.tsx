import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="group relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer rounded-full p-[3px] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-stamp-amber/80 focus-visible:ring-offset-2 focus-visible:ring-offset-paper hover:scale-[1.03] active:scale-[0.97] border border-ink/20 shadow-inner overflow-hidden select-none"
      style={{
        backgroundColor: isDark ? 'var(--kraft)' : 'var(--paper)',
        borderColor: 'var(--stamp-amber)',
      }}
    >
      {/* Background Track Icons */}
      <span className="absolute inset-0 flex items-center justify-between px-[6px] pointer-events-none text-ink/40">
        <Sun
          size={13}
          className={`transition-opacity duration-300 ${
            isDark ? 'opacity-30' : 'opacity-80 text-stamp-amber'
          }`}
        />
        <Moon
          size={13}
          className={`transition-opacity duration-300 ${
            isDark ? 'opacity-90 text-stamp-amber' : 'opacity-30'
          }`}
        />
      </span>

      {/* Sliding Thumb Container */}
      <span
        className="relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full shadow-md transition-transform duration-350 motion-reduce:transition-none motion-reduce:transform-none"
        style={{
          transform: isDark ? 'translateX(24px)' : 'translateX(0px)',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          backgroundColor: isDark ? 'var(--ink)' : '#FFFFFF',
          color: isDark ? '#E0A94D' : '#C68A2E',
          boxShadow: isDark
            ? '0 2px 5px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)'
            : '0 2px 4px rgba(30,42,56,0.25)',
        }}
      >
        {/* Sun Icon in Thumb */}
        <Sun
          size={13}
          className={`absolute transition-all duration-300 motion-reduce:duration-100 ${
            isDark
              ? 'opacity-0 rotate-180 scale-50'
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />

        {/* Moon Icon in Thumb */}
        <Moon
          size={13}
          className={`absolute transition-all duration-300 motion-reduce:duration-100 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-180 scale-50'
          }`}
        />
      </span>

      {/* Hover Ring / Glow Accent */}
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ring-1 ring-stamp-amber/40" />
    </button>
  );
};
