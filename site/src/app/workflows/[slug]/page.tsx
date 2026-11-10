import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, DownloadIcon, KeyRoundIcon } from "lucide-react";
import { bySlug, workflows } from "@/content/workflows";
import { CanvasImage, Chip } from "@/components/workflow-card";
import { Playground } from "@/components/playground";
import { GithubIcon } from "@/components/site";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return workflows.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: PageProps<"/workflows/[slug]">): Promise<Metadata> {
  const w = bySlug((await params).slug);
  return w ? { title: `${w.title} — n8n template`, description: w.description } : {};
}

export default async function WorkflowPage({ params }: PageProps<"/workflows/[slug]">) {
  const { slug } = await params;
  const w = bySlug(slug);
  if (!w) notFound();
  const i = workflows.findIndex((x) => x.slug === w.slug);
  const next = workflows[(i + 1) % workflows.length];

  return (
    <>
      <section className="pt-4 pb-7 lg:pt-6">
        <Link
          href="/#workflows"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface pr-4 pl-3 text-sm font-medium transition-colors hover:bg-ink/10"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> All workflows
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl animate-rise">
            <p className="text-sm font-medium text-ink-3">
              {w.index} · {w.category} · {w.nodes} nodes
            </p>
            <h1 className="mt-2 font-display text-[2.25rem] leading-[1.05] sm:text-[3rem]">{w.title}</h1>
            <p className="mt-3 max-w-2xl text-lg text-ink-3">{w.description}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {w.integrations.map((x) => (
                <Chip key={x} onCanvas>
                  {x}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/workflows/${w.file}`}
              download
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-ink/85 active:scale-[0.98]"
            >
              <DownloadIcon className="size-4" aria-hidden /> Download JSON
            </a>
            {site.repoUrl && (
              <a
                href={`${site.repoUrl}/blob/main/tools/workflows`}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-5 text-sm font-medium transition-colors hover:bg-ink/10 active:scale-[0.98]"
              >
                <GithubIcon className="size-4" /> Source
              </a>
            )}
          </div>
        </div>
      </section>

      <figure className="rounded-tile bg-surface p-3">
        <div className="overflow-hidden rounded-[1.9rem] bg-raised">
          <CanvasImage slug={w.slug} alt={`${w.title} in the n8n editor`} priority />
        </div>
        <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-1 text-xs text-ink-3">
          <span>
            n8n 2.40 editor · <span className="font-mono">{w.file}</span>
          </span>
          <span>Imports with one click</span>
        </figcaption>
      </figure>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="min-w-0">
          {w.demo ? (
            <Playground w={w} />
          ) : (
            <div className="rounded-tile bg-inverse px-6 pt-8 pb-8 text-inverse-foreground sm:px-7">
              <h2 className="text-2xl font-semibold">No live demo</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-inverse-muted">
                This workflow reacts to failures in your other workflows, so there&apos;s nothing to run from a browser. Import it and set it as the error
                workflow in each production workflow&apos;s settings.
              </p>
            </div>
          )}
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-tile bg-surface px-5 pt-7 pb-6 sm:px-7">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <ol className="mt-5 space-y-4">
              {w.steps.map((s, n) => (
                <li key={n} className="flex gap-3.5 text-sm leading-relaxed">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-xs font-semibold tabular">{n + 1}</span>
                  <span className="pt-1">{s}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-tile bg-surface px-5 pt-7 pb-6 sm:px-7">
            <h2 className="text-2xl font-semibold">Business outcomes</h2>
            <ul className="mt-5 grid gap-2">
              {w.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3 rounded-[1.25rem] bg-raised px-4 py-3 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden /> {o}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-tile bg-surface px-5 pt-7 pb-6 sm:px-7">
            <h2 className="text-2xl font-semibold">You&apos;ll need</h2>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {w.needs.map((n) => (
                <li key={n} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-raised px-3.5 text-xs font-medium">
                  <KeyRoundIcon className="size-3.5 text-ink-3" aria-hidden /> {n}
                </li>
              ))}
            </ul>
          </section>
          <Link
            href={`/workflows/${next.slug}`}
            className="group flex items-center gap-4 rounded-full bg-surface p-2 pr-6 transition-colors hover:bg-ink/10"
          >
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-ink text-bg">
              <ArrowRightIcon className="size-6 transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-ink-3">Next workflow</span>
              <span className="block truncate text-lg font-semibold">{next.title}</span>
            </span>
          </Link>
        </aside>
      </div>
    </>
  );
}
