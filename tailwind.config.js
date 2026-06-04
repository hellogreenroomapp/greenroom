/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#eef1f0',           // cool sophisticated base
        card: '#f8faf9',
        text: '#1a1a1a',
        muted: '#6b6b6b',
        border: '#d8dbd9',
        warehouse: '#88b094',    // forest sage
        queue: '#c9ad82',        // amber oat
        shoot: '#c9988a',        // clay
        edit: '#8a9eb3',         // steel blue
        staged: '#a894b0',       // plum mist
        live: '#5aab7c',         // brand-adjacent green      // faded sage
        // Override indigo colors with brand green (#1B7F56)
        indigo: {
          50: '#e8f5f0',
          100: '#d1ebe1',
          200: '#a3d7c3',
          300: '#75c3a5',
          400: '#47af87',
          500: '#2a9b6f',
          600: '#1B7F56', // Main brand color (most commonly used)
          700: '#156645',
          800: '#104c34',
          900: '#0a3323',
        },
        // Brand status colors (matching stage colors - much darker for contrast)
        brand: {
          pipeline: '#7a9575', // lichen (warehouse stage) - much darker
          needShots: '#b89a70', // oat (queue stage) - much darker
          live: '#5f9874', // faded sage (live stage) - much darker
          overdue: '#b87a70', // terracotta light (shoot stage) - much darker
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
