import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>("light");

  // Load initial theme from localStorage or system preference
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme) || null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = stored || (prefersDark ? "dark" : "light");
    applyTheme(initial);
  }, []);

  const applyTheme = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("theme", next);
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

