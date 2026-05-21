/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sap: {
          blue:    '#2563eb',
          hover:   '#1d4ed8',
          bg:      '#eef1f8',
          sidebar: '#0b1120',
          card:    '#ffffff',
          text:    '#0f172a',
          accent:  '#eff6ff',
        },
        fiori: {
          shell:   '#0b1120',
          tile:    '#ffffff',
          border:  '#e2e8f2',
          success: '#059669',
          error:   '#dc2626',
          warning: '#d97706',
        },
        navy: {
          DEFAULT: '#0b1120',
          950: '#060c18',
          900: '#0b1120',
          800: '#111827',
          700: '#1a2540',
          600: '#243050',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: { 13:'3.25rem', 15:'3.75rem' },
      borderRadius: { '2xl':'16px', '3xl':'20px', '4xl':'24px' },
      boxShadow: {
        'xs':     '0 1px 2px 0 rgb(0 0 0 / .04)',
        'card':   '0 1px 3px 0 rgb(0 0 0 / .07)',
        'card-md':'0 4px 8px -2px rgb(0 0 0 / .08)',
        'card-lg':'0 12px 24px -4px rgb(0 0 0 / .09)',
        'glow':   '0 0 0 3px rgba(37,99,235,.14)',
        'glow-lg':'0 0 24px rgba(37,99,235,.18)',
        'premium':'0 24px 48px -8px rgb(0 0 0 / .12)',
      },
      backgroundImage: {
        'gradient-blue': 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        'gradient-dark': 'linear-gradient(135deg, #060c18 0%, #111827 100%)',
        'gradient-mesh': 'radial-gradient(at 20% 20%, rgba(37,99,235,.08) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(99,102,241,.06) 0px, transparent 50%)',
      },
      animation: {
        'fade-up':   'fadeUp .24s cubic-bezier(.22,1,.36,1) forwards',
        'fade-in':   'fadeIn .18s ease forwards',
        'scale-in':  'scaleIn .2s cubic-bezier(.22,1,.36,1) forwards',
        'shimmer':   'shimmer 1.6s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
