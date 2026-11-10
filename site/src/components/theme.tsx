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
      className="grid size-11 place-items-center rounded-full bg-surface text-ink transition-colors hover:bg-ink/10 active:scale-[0.98]"
      aria-label="Toggle colour theme"
    >
      <SunIcon className="hidden size-[18px] dark:block" strokeWidth={1.75} />
      <MoonIcon className="size-[18px] dark:hidden" strokeWidth={1.75} />
    </button>
  );
}
