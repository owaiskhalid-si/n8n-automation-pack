import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./theme";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="7" className="fill-raised stroke-line-2" strokeWidth="1.5" />
      <path d="M8 18.5c3 0 3-9 6-9s3 9 6 9" fill="none" className="stroke-ink-3" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="18.5" r="2.4" className="fill-ink" />
      <circle cx="14" cy="9.5" r="2.4" className="fill-amber-fill" />
      <circle cx="20" cy="18.5" r="2.4" className="fill-ink" />
    </svg>
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
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-[1280px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} home`}>
          <LogoMark className="size-7" />
          <span className="text-[1.05rem] font-semibold tracking-tight">{site.name}</span>
          <span className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-3 sm:inline">n8n pack</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {site.repoUrl && (
            <a
              href={site.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="grid size-9 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-raised hover:text-ink"
              aria-label="Source on GitHub"
            >
              <GithubIcon className="size-4" />
            </a>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-10 text-sm text-ink-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <span className="text-ink-2">{site.name}</span>
          <span>· n8n 2.40 · Gemini · Next.js 16 · Oracle Cloud</span>
        </div>
        <p>
          Demo runs never send emails, messages or create records.
          {site.authorName && (
            <>
              {" "}
              Built by{" "}
              {site.authorUrl ? (
                <a className="text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink" href={site.authorUrl}>
                  {site.authorName}
                </a>
              ) : (
                <span className="text-ink-2">{site.authorName}</span>
              )}
              .
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
