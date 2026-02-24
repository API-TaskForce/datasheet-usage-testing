/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette
        primary: {
          DEFAULT: '#ffffff',
          dark: '#f9f9f9',
          light: '#ffffff',
        },
        // Secondary palette
        secondary: {
          DEFAULT: '#343a40',
          light: '#495057',
          lighter: '#6c757d',
        },
        // Accent colors
        accent: {
          DEFAULT: '#be1d37',
          light: '#e63946',
        },
        // Status colors
        success: {
          DEFAULT: '#007c35',
          light: '#4ade80',
        },
        warning: '#c78100',
        error: '#be1d37',
        info: '#5f92c5',
        // Background colors
        bg: {
          DEFAULT: '#f7f7f8',
          dark: '#f0f0f1',
          light: '#ffffff',
        },
        // Text colors
        text: {
          DEFAULT: '#1e1f20',
          light: '#495057',
          muted: '#6b7280',
          inverse: '#ffffff',
          secondary: '#495057',
        },
        // Border colors
        border: {
          DEFAULT: 'rgba(31, 41, 55, 0.1)',
          dark: 'rgba(31, 41, 55, 0.2)',
          light: 'rgba(31, 41, 55, 0.06)',
        },
      },
    },
  },
  plugins: [],
}
