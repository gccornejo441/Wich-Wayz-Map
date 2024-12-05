import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "flowbite";

import App from "./App.tsx";
import { ShopsProvider } from "./context/shopContext.tsx";
import { AuthProvider } from "./context/authContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ShopsProvider>
        <App />
      </ShopsProvider>
    </AuthProvider>
  </StrictMode>,
);
