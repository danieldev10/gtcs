import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17194f',
        mist: '#f4faf5',
        line: '#dbe8df',
        spruce: '#00894a',
        marigold: '#ef2d35',
        plum: '#545a82',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        pill: '999px',
      },
      boxShadow: {
        soft: '0 10px 28px rgba(23, 25, 79, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
