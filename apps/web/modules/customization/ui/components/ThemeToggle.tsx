"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button aria-hidden className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${className}`}>
        {/* placeholder to avoid SSR mismatch */}
        <Sun className="size-4" />
      </button>
    );
  }

  const current = theme === "system" ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md hover:opacity-90 ${className}`}
    >
      {current === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
