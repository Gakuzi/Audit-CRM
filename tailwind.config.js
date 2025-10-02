
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.gray[800]'),
            '--tw-prose-headings': theme('colors.gray[900]'),
            '--tw-prose-invert-body': theme('colors.gray[200]'),
            '--tw-prose-invert-headings': theme('colors.white'),
          },
        },
      }),
    },
  },
  plugins: [
      require('@tailwindcss/typography'),
  ],
}
