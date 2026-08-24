/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1ECE0',
        ink: '#1E2A38',
        kraft: '#E6DEC8',
        'stamp-red': '#B4432E',
        'stamp-green': '#2E6B4F',
        'stamp-amber': '#C68A2E',
        'stamp-blue': '#1D5C8A',
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
