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

/** Small pill. White on a tile; `onCanvas` uses the tile grey on the white page. */
export function Chip({ children, onCanvas }: { children: React.ReactNode; onCanvas?: boolean }) {
  return (
    <span className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium whitespace-nowrap ${onCanvas ? "bg-surface" : "bg-raised"}`}>{children}</span>
  );
}

/** `wide` fills a row on its own (the odd card out): canvas left, text right. */
export function WorkflowCard({ w, wide }: { w: Workflow; wide?: boolean }) {
  return (
    <Link
      href={`/workflows/${w.slug}`}
      className={`group flex min-w-0 flex-col rounded-tile bg-surface p-3 pb-6 transition-colors hover:bg-ink/[0.09] ${
        wide ? "md:col-span-2 md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:gap-4 md:pb-3 xl:col-span-3" : ""
      }`}
    >
      <div className="relative overflow-hidden rounded-[1.9rem] bg-raised">
        <CanvasImage
          slug={w.slug}
          variant="card"
          alt={`${w.title} workflow canvas`}
          className="aspect-[1.6] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {w.demo && (
          <span className="absolute top-3 left-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-medium text-[#111]">
            <span className="live-dot size-1.5 rounded-full bg-signal" /> Live demo
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col px-3 pt-5 sm:px-4 ${wide ? "md:py-4 md:pr-6" : ""}`}>
        <p className="label">
          {w.index} · {w.category}
        </p>
        <h3 className="mt-1.5 text-2xl leading-tight font-semibold">{w.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-3">{w.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {w.integrations.slice(0, 4).map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <span className="text-ink-3 tabular">{w.nodes} nodes</span>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-raised px-4 font-medium transition-colors group-hover:bg-ink group-hover:text-bg">
            {w.demo ? (
              <>
                <PlayIcon className="size-3.5" aria-hidden /> Try it live
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
