/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#D4AF37",
          green: "#0B6E4F",
          darkGreen: "#083B2F",
          beige: "#E8E0C8",
          dark: "#1A1A1A"
        },
        sand: {
          50: "#FAFAFA",  // Crisp clean off-white background
          100: "#F5F5F5",
          200: "#EAEAEA",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717"
        },
        charcoal: {
          DEFAULT: "#1A1A1A", // Dark Gray
          light: "#333333",
          muted: "#666666",
          deep: "#000000"
        },
        terracotta: {
          DEFAULT: "#D4AF37", // Swapped: Now Gold is primary
          hover: "#C09A2D",   // Darker Gold for hover
          light: "#f0dfa8",
          soft: "#fdfbf7"
        },
        sage: {
          DEFAULT: "#0B6E4F", // Swapped: Now Green is secondary
          dark: "#083B2F",
          light: "#d4e8dd",
          soft: "#f2f8f5"
        },
        gold: {
          50: "#FFFCF5",
          100: "#FFF6E0",
          200: "#FFEBC2",
          300: "#FFD994",
          400: "#FFC25C",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        stone: "#FAFAFA" // Clean background
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',      // 16px - Standard premium Apple/Airbnb card radius
        '3xl': '1.5rem',    // 24px - For large modals/heroes
        'xl': '0.75rem',    // 12px - Great for inputs/buttons
        'lg': '0.5rem',     // 8px - Smaller elements
      },
      boxShadow: {
        'premium': '0 8px 30px rgba(0, 0, 0, 0.04), 0 2px 10px rgba(0, 0, 0, 0.02)', // Ultra-soft Apple-like shadow
        'glass': '0 8px 32px rgba(0, 0, 0, 0.06)',
        'elevated': '0 20px 40px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)', // Stronger but soft
        'subtle': '0 2px 8px rgba(0, 0, 0, 0.03)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
