import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { site } from "@/lib/site";
import { ThemeToggle } from "./theme";

/** Three nodes on a wire, the middle one live. Drawn white inside an ink circle. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-ink ${className ?? "size-10"}`} aria-hidden="true">
      <svg viewBox="0 0 28 28" className="size-[62%]">
        <path d="M6 18c3.5 0 4-8 8-8s4.5 8 8 8" fill="none" className="stroke-bg" strokeOpacity={0.55} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="6" cy="18" r="2.6" className="fill-bg" />
        <circle cx="14" cy="10" r="3" className="fill-signal" />
        <circle cx="22" cy="18" r="2.6" className="fill-bg" />
      </svg>
    </span>
  );
}

export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

const nav = [
  { href: "/#workflows", label: "Workflows" },
  { href: "/#pipeline", label: "How it's built" },
  { href: "/#hosting", label: "Hosting" },
];

export function SiteHeader() {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${site.name} home`}>
          <LogoMark className="size-10" />
          <span className="text-lg font-semibold tracking-tight">{site.name}</span>
        </Link>
        <nav className="mx-auto hidden h-12 items-center gap-1 rounded-full bg-surface p-1 md:flex" aria-label="Sections">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="inline-flex h-full items-center rounded-full px-5 text-sm font-medium text-ink-3 transition-colors hover:bg-raised hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {site.repoUrl && (
            <a
              href={site.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="grid size-11 place-items-center rounded-full bg-surface transition-colors hover:bg-ink/10"
              aria-label="Source on GitHub"
            >
              <GithubIcon className="size-[18px]" />
            </a>
          )}
          <ThemeToggle />
          <Link
            href="/workflows/lead-qualifier"
            className="hidden h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-ink/85 active:scale-[0.98] sm:inline-flex"
          >
            Try a live demo <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
      <nav className="scrollbar-none -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 md:hidden" aria-label="Sections">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="inline-flex h-10 shrink-0 items-center rounded-full bg-surface px-4 text-sm font-medium">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-5 flex flex-col gap-6 rounded-tile bg-surface px-6 py-10 text-sm sm:px-10 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <LogoMark className="size-10" />
        <div>
          <p className="text-base font-semibold">{site.name}</p>
          <p className="text-ink-3">n8n 2.40 · Gemini · Next.js 16 · Oracle Cloud</p>
        </div>
      </div>
      <p className="max-w-md text-ink-3 md:text-right">
        Demo runs never send emails, messages or create records.
        {site.authorName && (
          <>
            {" "}
            Built by{" "}
            {site.authorUrl ? (
              <a className="font-medium text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink" href={site.authorUrl}>
                {site.authorName}
              </a>
            ) : (
              <span className="font-medium text-ink">{site.authorName}</span>
            )}
            .
          </>
        )}
      </p>
    </footer>
  );
}
