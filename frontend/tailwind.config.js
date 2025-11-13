/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'primary-background': '#000000',
          'secondary-background': '#0A0A0A',
          'primary-text': '#FFFFFF',
          'secondary-text': '#8E8E8E',
          'error-text': '#fb2c36',
          'primary-border': '#2E2E2E',
          'primary-accent': '#EF6262',
          'primary-accent-hover': '#F49191',
          'secondary-accent-hover': '#171717'
        }
      }
    },
    plugins: [],
  }