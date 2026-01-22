import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "flowbite";

import App from "./App.tsx";
import { ShopsProvider } from "./context/shopContext.tsx";
import { AuthProvider } from "./context/authContext.tsx";

// Theme initialization is handled by useTheme hook via useSyncExternalStore
// The hook's initTheme() function runs on first subscription and handles:
// - Reading from localStorage
// - Falling back to system preference
// - Applying the dark class to document.documentElement

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ShopsProvider>
        <App />
      </ShopsProvider>
    </AuthProvider>
  </StrictMode>,
);
