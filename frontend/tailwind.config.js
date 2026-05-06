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
          muted: "#8C8C8C"
        },
        terracotta: {
          DEFAULT: "#C05C4F",
          hover: "#A94E42",
          light: "#D8897E"
        },
        sage: {
          DEFAULT: "#788574",
          dark: "#525C4F",
          light: "#9FAB9C"
        },
        stone: "#F5F5F0"
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        'lg': '0.75rem',
      },
    },
  },
  plugins: [],
}
