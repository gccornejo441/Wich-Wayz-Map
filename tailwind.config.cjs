/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite-react/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#DA291C", // red
        primaryBorder: "#5a110c", // dark red
        secondary: "#FFC72C", // yellow
        background: "#FFFFFF", // white
        accent: "#333333", // Dark gray/black
        dark: "#343a40", // dark gray
        lightGray: "#F5F5F5", // light gray
      },
      fontFamily: {
        sans: ["'Open Sans'", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
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
  plugins: [require("@tailwindcss/typography"), require("flowbite/plugin")],
};
