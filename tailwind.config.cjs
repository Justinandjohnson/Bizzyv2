/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx,pcss}",
  ],
  theme: {
    extend: {
      colors: {
        "neon-green": {
          DEFAULT: "#39FF14",
          dark: "#32CD32",
        },
      },
    },
  },
  plugins: [],
};
