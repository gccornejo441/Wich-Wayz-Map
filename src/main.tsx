import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "flowbite";

import App from "./App.tsx";
import { ShopsProvider } from "./context/shopContext.tsx";
import { AuthProvider } from "./context/authContext.tsx";

const prefersDark =
  localStorage.theme === "dark" ||
  (!("theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches);

if (prefersDark) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ShopsProvider>
        <App />
      </ShopsProvider>
    </AuthProvider>
  </StrictMode>,
);
