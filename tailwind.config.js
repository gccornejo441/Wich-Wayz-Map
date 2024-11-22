/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#d9534f", // red
        secondary: "#f0ad4e", // yellow
        background: "#f8f9fa", // gray
        accent: "#9AD14B", // yellow green
        dark: "#343a40", // dark gray
      },
      fontFamily: {
        sans: ["'Open Sans'", "sans-serif"],
      },
      borderRadius: {
        lg: "12px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 4px 6px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
