/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FDFCF8",
          100: "#FBF9F2",
          200: "#F5F2E6",
          300: "#EBE5D3",
          400: "#DCD3B9",
          500: "#CCBE9E",
          600: "#BAA783",
          700: "#A28D67",
          800: "#857355",
          900: "#6C5E47"
        },
        charcoal: {
          DEFAULT: "#2C2C2C",
          light: "#5C5C5C",
          muted: "#8C8C8C",
          deep: "#1A1A1A"
        },
        terracotta: {
          DEFAULT: "#C05C4F",
          hover: "#A94E42",
          light: "#D8897E",
          soft: "#F8EBE9"
        },
        sage: {
          DEFAULT: "#788574",
          dark: "#525C4F",
          light: "#9FAB9C",
          soft: "#F0F2F0"
        },
        gold: {
          50: "#FFFDF0",
          100: "#FFFBEB",
          200: "#FEF3C7",
          300: "#FDE68A",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        stone: "#F5F5F0"
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.5rem',
        'xl': '1.25rem',
        'lg': '0.85rem',
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'elevated': '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
