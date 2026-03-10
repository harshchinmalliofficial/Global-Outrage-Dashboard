/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 
               'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        charcoal: '#121212',
        'dark-navy': '#0F172A',
        forest: {
          DEFAULT: '#1B4332',
          text: '#74C69D',
        },
        burgundy: {
          DEFAULT: '#4A1111',
          text: '#E5989B',
        },
        'amber-muted': {
          DEFAULT: '#453214',
          text: '#FFB703',
        },
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'ticker': 'ticker 40s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}