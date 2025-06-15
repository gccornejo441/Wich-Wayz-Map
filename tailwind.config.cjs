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
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "check-bounce": "check-bounce 0.5s ease-out both",
        fadeIn: "fadeIn 0.3s ease-out",
        slideUp: "slideUp 0.3s ease-out",
      },
      transitionProperty: {
        sidebar: "background-color, color, border-color",
      },
      colors: {
        brand: {
          primary: "#DA291C", // red
          primaryBorder: "#5A110C", // dark red
          primaryHover: "#5A110C", // dark red
          secondary: "#FFC72C", // yellow
          secondaryBorder: "#E4B226", // yellow dark
          secondaryHover: "#CfA223", // yellow dark
        },
        surface: {
          light: "#FFFFFF", // for light backgrounds
          dark: "#1E1E2F", // updated: deeper slate for full-page dark backgrounds
          darker: "#14141F", // new: for card containers in dark mode
          muted: "#F5F5F5", // for light panels/cards
        },
        text: {
          base: "#333333", // default text
          inverted: "#FFFFFF", // text on dark background
          muted: "#9CA3AF", // secondary text
        },
        accent: "#DA291C", // alias red accent
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
