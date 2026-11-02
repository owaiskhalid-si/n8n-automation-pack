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
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-dots absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-[1280px] px-4 pt-10 pb-10 sm:px-6">
          <Link href="/#workflows" className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
            <ArrowLeftIcon className="size-4" aria-hidden /> All workflows
          </Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl animate-rise">
              <p className="label">
                {w.index} · {w.category} · {w.nodes} nodes
              </p>
              <h1 className="mt-3 text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[3.2rem]">{w.title}</h1>
              <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{w.description}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {w.integrations.map((x) => (
                  <Chip key={x}>{x}</Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/workflows/${w.file}`}
                download
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 text-sm font-medium transition-colors hover:border-ink-3"
              >
                <DownloadIcon className="size-4" aria-hidden /> Download JSON
              </a>
              {site.repoUrl && (
                <a
                  href={`${site.repoUrl}/blob/main/tools/workflows`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 text-sm font-medium transition-colors hover:border-ink-3"
                >
                  <GithubIcon className="size-4" /> Source
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6">
        <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
          <CanvasImage slug={w.slug} alt={`${w.title} in the n8n editor`} priority />
          <figcaption className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[0.6875rem] text-ink-3">
            <span>n8n 2.40 editor · {w.file}</span>
            <span>imports with one click</span>
          </figcaption>
        </figure>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="min-w-0">
            {w.demo ? (
              <Playground w={w} />
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-6">
                <p className="label">No live demo</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  This workflow reacts to failures in your other workflows, so there&apos;s nothing to run from a browser. Import it and set it as the
                  error workflow in each production workflow&apos;s settings.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="label">How it works</h2>
              <ol className="mt-4 space-y-4">
                {w.steps.map((s, n) => (
                  <li key={n} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line bg-bg-2 font-mono text-[0.6875rem] text-amber">{n + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="label">Business outcomes</h2>
              <ul className="mt-3 space-y-2">
                {w.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-sm text-ink">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-good" aria-hidden /> {o}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="label">You&apos;ll need</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {w.needs.map((n) => (
                  <li key={n} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg-2 px-2.5 py-1 text-xs text-ink-2">
                    <KeyRoundIcon className="size-3 text-ink-3" aria-hidden /> {n}
                  </li>
                ))}
              </ul>
            </section>
            <Link
              href={`/workflows/${next.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-2"
            >
              <span>
                <span className="label">Next workflow</span>
                <span className="mt-1 block font-medium">{next.title}</span>
              </span>
              <ArrowRightIcon className="size-5 text-ink-3 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
