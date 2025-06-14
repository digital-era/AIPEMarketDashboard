/** @type {import('tailwindcss').Config} */
module.exports = {
  // Add this line to enable class-based dark mode
  darkMode: 'class',

  content: [
    "./*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      // Optional: Add specific dark mode colors for a more custom theme
      colors: {
        dark: {
          bg: '#0D1117', // A deep, GitHub-like dark background
          card: '#161B22', // Card background
          border: '#30363D', // Border color
          text: '#C9D1D9', // Primary text
          subtle: '#8B949E', // Subtle text
        }
      }
    },
  },
  plugins: [],
}
