import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon, PlayIcon } from "lucide-react";
import type { Workflow } from "@/content/workflows";

/**
 * Screenshot of the workflow in the n8n editor, swapped for the active theme.
 * `card` is a tighter capture without sticky notes, used for thumbnails.
 */
export function CanvasImage({
  slug,
  alt,
  priority,
  className,
  variant = "full",
}: {
  slug: string;
  alt: string;
  priority?: boolean;
  className?: string;
  variant?: "full" | "card";
}) {
  const base = variant === "card" ? `/canvas/${slug}-card` : `/canvas/${slug}`;
  const [width, height] = variant === "card" ? [1600, 1000] : [2040, 1020];
  return (
    <>
      <Image
        src={`${base}-dark.png`}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`hidden h-auto w-full dark:block ${className ?? ""}`}
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
      <Image
        src={`${base}-light.png`}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`h-auto w-full dark:hidden ${className ?? ""}`}
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
    </>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-line bg-bg-2 px-2 py-0.5 font-mono text-[0.6875rem] whitespace-nowrap text-ink-2">{children}</span>;
}

export function WorkflowCard({ w }: { w: Workflow }) {
  return (
    <Link
      href={`/workflows/${w.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-[0_30px_60px_-40px_rgb(0_0_0/0.6)]"
    >
      <div className="relative overflow-hidden border-b border-line">
        <CanvasImage
          slug={w.slug}
          variant="card"
          alt={`${w.title} workflow canvas`}
          className="aspect-[1.6] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
        {w.demo && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[0.625rem] tracking-wide text-ink uppercase backdrop-blur">
            <span className="size-1.5 rounded-full bg-good" /> Live demo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="label">
          {w.index} · {w.category}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">{w.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{w.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {w.integrations.slice(0, 4).map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="font-mono text-xs text-ink-3">{w.nodes} nodes</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
            {w.demo ? (
              <>
                <PlayIcon className="size-3.5 text-amber" aria-hidden /> Try it live
              </>
            ) : (
              <>
                View workflow <ArrowUpRightIcon className="size-3.5" aria-hidden />
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
