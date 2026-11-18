/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FAF9F6',
          100: '#F3F1EC',
          200: '#E5E2DC',
          300: '#D7D3CB',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#141413',
        },
        desk: {
          bg: '#141413',
          panel: '#1E1D1B',
          card: '#252422',
          border: '#2E2C29',
          borderLight: '#3D3A36',
          text: '#F5F5F4',
          textMuted: '#A8A29E',
          textFaint: '#78716C',
        },
        manuscript: {
          bg: '#FAF9F6',
          panel: '#F3F1EC',
          card: '#FFFFFF',
          border: '#E5E2DC',
          borderLight: '#EDEAE4',
          text: '#1C1917',
          textMuted: '#57534E',
          textFaint: '#78716C',
        },
        terracotta: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Lora', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
