import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d2433',
        mist: '#f5f7fb',
        line: '#d9e0ec',
        spruce: '#0f766e',
        marigold: '#b7791f',
        plum: '#7c3aed',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(29, 36, 51, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
