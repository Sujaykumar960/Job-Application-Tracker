/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'laptop': '1280px',
      'laptop-lg': '1440px',
      'desktop': '1536px',
    },
    extend: {
      maxWidth: {
        'content': '1400px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      colors: {
        brand: {
          50: '#E8F3FF',
          100: '#E8F3FF',
          200: '#d0e6fc',
          300: '#0A66C2',
          400: '#0A66C2',
          500: '#0A66C2',
          600: '#0A66C2',
          700: '#004182',
          800: '#004182',
          900: '#002c59',
          950: '#001933',
        },
        surface: {
          50: '#FFFFFF',
          100: '#F3F6F8',
          200: '#E8E8E8',
          300: '#D9D9D9',
          400: '#788896',
          500: '#56687A',
          600: '#38434F',
          700: '#D9D9D9',
          750: '#D9D9D9',
          800: '#E8E8E8',
          850: '#E8E8E8',
          900: '#FFFFFF',
          950: '#F3F2EF',
        },
        ink: {
          primary: '#1D2226',
          secondary: '#56687A',
          muted: '#788896',
          subtle: '#667788',
          disabled: '#9AA5B1',
          body: '#38434F',
          link: '#0A66C2',
          'link-hover': '#004182',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
