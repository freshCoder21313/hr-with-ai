/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",      // Quét file ở root (App.tsx, index.tsx...)
    "./features/**/*.{js,ts,jsx,tsx}", // Quét thư mục features
    "./components/**/*.{js,ts,jsx,tsx}", // Quét thư mục components
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        secondary: '#334155',
        accent: '#2563eb',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
