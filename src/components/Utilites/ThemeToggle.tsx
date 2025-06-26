import { useTheme } from "@/hooks/useTheme";
import { FaMoon, FaSun } from "react-icons/fa";

import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Dark Mode"
      className="group mt-4 flex items-center space-x-2 text-xs text-white/70 hover:text-white transition-all"
    >
      <div className="relative w-5 h-5">
        <FaMoon
          className={`absolute w-5 h-5 transition-transform duration-300 ease-in-out ${
            theme === "dark" ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
          }`}
        />
        <FaSun
          className={`absolute w-5 h-5 transition-transform duration-300 ease-in-out ${
            theme === "light" ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
          }`}
        />
      </div>
      <span>{theme === "dark" ? "Dark" : "Light"} Mode</span>
    </button>
  );
};

export default ThemeToggle;
