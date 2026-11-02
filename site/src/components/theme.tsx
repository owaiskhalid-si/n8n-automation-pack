"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeProvider(props: React.ComponentProps<typeof NextThemes>) {
  return <NextThemes {...props} />;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-raised hover:text-ink"
      aria-label="Toggle colour theme"
    >
      <SunIcon className="hidden size-4 dark:block" />
      <MoonIcon className="size-4 dark:hidden" />
    </button>
  );
}
