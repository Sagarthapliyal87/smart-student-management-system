/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef4ff', 100: '#dce8ff', 200: '#b9d1ff', 300: '#8bb0ff', 400: '#5c8bff', 500: '#3366ff', 600: '#264fe0', 700: '#1e3fb8', 800: '#1a3591', 900: '#182f74' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
