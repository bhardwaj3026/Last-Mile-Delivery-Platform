/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        kraft: 'var(--kraft)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'stamp-red': 'var(--stamp-red)',
        'stamp-green': 'var(--stamp-green)',
        'stamp-amber': 'var(--stamp-amber)',
        'stamp-blue': 'var(--stamp-blue)',
      },
      fontFamily: {
        stencil: ['"Archivo Narrow"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'stamp-drop': 'stampDrop 0.25s ease-out forwards',
        'radar-pulse': 'radarPulse 2s ease-in-out infinite',
      },
      keyframes: {
        stampDrop: {
          '0%': { transform: 'scale(1.4) rotate(0deg)', opacity: '0' },
          '70%': { transform: 'scale(0.95) rotate(-3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
        },
        radarPulse: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '50%': { transform: 'scale(1.4)', opacity: '0.2' },
          '100%': { transform: 'scale(0.8)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
