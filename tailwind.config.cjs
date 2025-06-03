/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite-react/**/*.js",
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "check-bounce": {
          "0%": { transform: "scale(0.8)", opacity: 0 },
          "50%": { transform: "scale(1.2)", opacity: 1 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "check-bounce": "check-bounce 0.5s ease-out both",
      },
      transitionProperty: {
        sidebar: "background-color, color, border-color",
      },
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
