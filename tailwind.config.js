/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0071c2',
        secondary: '#00a698',
        accent: '#ff5d5d',
        dark: '#333333',
        light: '#f5f5f5',
      },
    },
  },
  plugins: [],
} 