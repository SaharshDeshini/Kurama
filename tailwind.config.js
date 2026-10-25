/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        background: {
          light: '#030712',
          dark: '#030712',
        },
        surface: {
          light: '#0B0F19',
          dark: '#0B0F19',
        },
        surfaceHover: {
          light: '#131D2E',
          dark: '#131D2E',
        },
        border: {
          light: '#1A2744',
          dark: '#1A2744',
        },
        subtle: {
          light: '#8295B0',
          dark: '#8295B0',
        },
        ember: {
          DEFAULT: '#38BDF8',
          light: '#7DD3FC',
          dark: '#0284C7',
          neon: '#00F0FF',
          subtle: '#0EA5E9',
        },
        blue: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#04182E',
        },
        ok: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        warn: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        miss: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        }
      },
      boxShadow: {
        card: '4px 4px 0 0 rgba(0, 0, 0, 0.5)',
        'card-dark': '4px 4px 0 0 rgba(0, 0, 0, 0.7)',
        glow: '0 0 24px 3px rgba(56, 189, 248, 0.7), 0 0 50px 8px rgba(14, 165, 233, 0.35)',
        'glow-sm': '0 0 14px 2px rgba(56, 189, 248, 0.65)',
        'glow-lg': '0 0 40px 6px rgba(56, 189, 248, 0.85), 0 0 80px 15px rgba(14, 165, 233, 0.45)',
      }
    },
  },
  plugins: [],
}
