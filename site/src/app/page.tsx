import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  CloudIcon,
  DatabaseIcon,
  HardDriveDownloadIcon,
  KeyRoundIcon,
  LockIcon,
  ServerIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from "lucide-react";
import { workflows } from "@/content/workflows";
import { HeroGraph } from "@/components/hero-graph";
import { WorkflowCard } from "@/components/workflow-card";
import { site } from "@/lib/site";

const pipeline = [
  { file: "tools/workflows/*.mjs", title: "Author as code", body: "Each workflow is a small JS module built from shared helpers — reviewable diffs instead of 2,000-line JSON blobs." },
  { file: "tools/build.mjs", title: "Generate", body: "Deterministic IDs produce importable n8n JSON. Credential IDs are injected per environment, never committed." },
  { file: "tools/validate.mjs", title: "Validate", body: "Every node type, version and parameter is checked against n8n 2.40's own node schemas." },
  { file: "tools/test-code-nodes.mjs", title: "Unit test", body: "JavaScript inside Code nodes runs with n8n's globals — Luxon, $json, $input — before it ever reaches n8n." },
  { file: "tools/e2e/run.mjs", title: "End-to-end", body: "Real n8n in Docker plus a mock Gemini API. Every webhook is published, called and its response asserted." },
  { file: "infra/oracle/setup.sh", title: "Ship", body: "One script turns a free Oracle Cloud VM into n8n + Postgres + Caddy; deploy-workflows.sh then runs the same pipeline against production credentials." },
];

export default function Home() {
  const stats = [
    [String(workflows.length), "production workflows"],
    [String(workflows.filter((w) => w.demo).length), "live demos"],
    [String(workflows.reduce((s, w) => s + w.nodes, 0)), "nodes, all schema-validated"],
    ["$0", "a month to self-host"],
  ];
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_40%,black_20%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 px-4 pt-16 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pt-24">
          <div className="animate-rise">
            <p className="label flex items-center gap-2">
              <span className="size-1.5 animate-pulse rounded-full bg-good" /> n8n automation pack · Gemini inside
            </p>
            <h1 className="mt-5 text-[2.9rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[4rem]">
              Automations that do the busywork.
              <span className="block text-amber">Try them live.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-ink-2">
              Seven production-ready n8n workflows — lead qualification, invoice extraction, support triage, content repurposing, booking reminders
              and KPI reports. Each one tested end-to-end and self-hosted for $0 a month on Oracle Cloud — or on AWS with Terraform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/workflows/lead-qualifier"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-fill px-5 text-sm font-semibold text-amber-ink transition-transform hover:-translate-y-0.5"
              >
                Run a live demo <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="#workflows"
                className="inline-flex h-11 items-center rounded-xl border border-line-2 bg-surface px-5 text-sm font-medium transition-colors hover:border-ink-3"
              >
                Browse all 7
              </Link>
            </div>
          </div>

          <div className="animate-rise [animation-delay:150ms]">
            <div className="rounded-2xl border border-line bg-surface/70 p-4 shadow-[0_40px_80px_-50px_rgb(0_0_0/0.7)] backdrop-blur-sm sm:p-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-ink-3">01-ai-lead-qualifier.json</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-good/10 px-2 py-0.5 font-mono text-[0.625rem] text-good">
                  <span className="size-1.5 rounded-full bg-good" /> ACTIVE
                </span>
              </div>
              <HeroGraph />
              <div className="mt-2 rounded-xl border border-line bg-bg-2 px-4 py-3 font-mono text-[0.72rem] leading-relaxed">
                <p className="text-ink-2">
                  <span className="text-ink-3">▸</span> POST /webhook/lead-qualifier <span className="text-good">200</span> <span className="text-ink-3">1.8s</span>
                </p>
                <p className="text-ink-3">
                  score <span className="text-ink">82</span> · tier <span className="text-amber">hot</span> · → #sales, CRM sheet, reply draft
                  <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-amber-fill" />
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-[1280px] px-4 pb-14 sm:px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
            {stats.map(([v, l]) => (
              <div key={l} className="bg-surface px-5 py-4">
                <dt className="sr-only">{l}</dt>
                <dd>
                  <span className="block text-3xl font-semibold tracking-tight">{v}</span>
                  <span className="mt-1 block text-xs text-ink-3">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Workflows */}
      <section id="workflows" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pt-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="label">The workflows</p>
            <h2 className="mt-3 text-[2.25rem] leading-tight font-semibold tracking-[-0.02em] text-balance">Real business problems, wired end to end.</h2>
            <p className="mt-3 text-ink-2">Open any workflow to see its canvas, how it works, and run it live with your own input.</p>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <WorkflowCard key={w.slug} w={w} />
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pt-28 sm:px-6">
        <div className="max-w-2xl">
          <p className="label">How it&apos;s built</p>
          <h2 className="mt-3 text-[2.25rem] leading-tight font-semibold tracking-[-0.02em] text-balance">Workflows as code, tested like software.</h2>
          <p className="mt-3 text-ink-2">
            Most n8n templates are exported once and hoped for. These are generated, validated and tested in CI on every change.
          </p>
        </div>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {pipeline.map((p, i) => (
            <li key={p.title} className="relative bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-lg border border-line bg-bg-2 font-mono text-xs text-amber">{String(i + 1).padStart(2, "0")}</span>
                <code className="truncate pl-3 font-mono text-[0.6875rem] text-ink-3">{p.file}</code>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Hosting */}
      <section id="hosting" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pt-28 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <p className="label">Production hosting</p>
            <h2 className="mt-3 text-[2.25rem] leading-tight font-semibold tracking-[-0.02em] text-balance">Self-hosted for $0 a month, in one script.</h2>
            <p className="mt-3 text-ink-2">
              The live demo runs on an Oracle Cloud <strong className="font-medium text-ink">Always Free</strong> Ampere VM — 4 cores, 24 GB of RAM, no bill.
              One script installs Docker, generates the secrets and brings up n8n, Postgres and Caddy. Prefer AWS? Terraform for a Graviton
              instance in ca-central-1 is included.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Automatic HTTPS with Caddy + Let's Encrypt — a free sslip.io or DuckDNS hostname is enough",
                "Secrets generated on the server, never committed",
                "Nightly Postgres + workflow backups, 14-day rotation (S3 optional)",
                "Editor lockable to your office IP; webhooks stay public",
                "Firewall open on 80/443 only, swap file, unattended security updates",
                "The same Compose stack runs on any VPS — Oracle, AWS, Hetzner, a home server",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-ink-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-good" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <pre className="mt-8 overflow-x-auto rounded-xl border border-line bg-bg-2 p-4 font-mono text-[0.75rem] leading-relaxed text-ink-2">
              <code>
                <span className="text-ink-3">$</span> git clone https://github.com/…/n8n-automation-pack{"\n"}
                <span className="text-ink-3">$</span> sudo bash n8n-automation-pack/infra/oracle/setup.sh \{"\n"}
                {"    "}--domain n8n.yourco.ca --email ops@yourco.ca{"\n"}
                <span className="text-good">✓ n8n is starting at https://n8n.yourco.ca</span>
              </code>
            </pre>
          </div>
          <ArchitectureDiagram />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6">
        <div className="bg-dots relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 sm:px-12">
          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="text-[2.1rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.6rem]">
                Want automations like these <span className="text-amber">running in your business?</span>
              </h2>
              <p className="mt-4 text-ink-2">
                Every workflow here is a starting point: connected to your CRM, inbox, booking system or database, with your prompts and your rules.
              </p>
            </div>
            {site.repoUrl && (
              <a
                href={site.repoUrl}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5"
              >
                Get the templates <ArrowRightIcon className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Box({ icon: Icon, title, sub, className }: { icon: typeof ServerIcon; title: string; sub: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-line bg-raised px-3.5 py-3 ${className ?? ""}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg-2 text-amber">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate font-mono text-[0.6875rem] text-ink-3">{sub}</span>
      </span>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <figure className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-label="Hosting architecture">
      <div className="flex items-center justify-between">
        <span className="label">Architecture</span>
        <span className="font-mono text-[0.6875rem] text-ink-3">Oracle Cloud · Always Free</span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Box icon={CloudIcon} title="This site" sub="Vercel · Next.js" />
        <Box icon={TerminalIcon} title="Your apps" sub="forms · CRM · booking" />
      </div>
      <div className="flex items-center justify-center gap-2 py-2 font-mono text-[0.625rem] text-ink-3">
        <svg viewBox="0 0 12 36" className="h-9 w-3" aria-hidden>
          <path d="M6 0v30" stroke="var(--amber-fill)" strokeWidth="1.5" className="wire-flow" />
          <path d="M1 28l5 6 5-6" fill="none" stroke="var(--amber-fill)" strokeWidth="1.5" />
        </svg>
        HTTPS · webhooks
      </div>
      <div className="rounded-xl border border-dashed border-line-2 p-3">
        <p className="mb-2 flex flex-wrap items-center justify-between gap-x-3 font-mono text-[0.6875rem] text-ink-3">
          <span>Ampere A1 VM · Docker Compose</span>
          <span>4 OCPU · 24 GB · ARM64</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Box icon={LockIcon} title="Caddy" sub="TLS · IP allowlist" />
          <Box icon={ServerIcon} title="n8n 2.40" sub="task runners" />
          <Box icon={DatabaseIcon} title="Postgres 16" sub="state · history" />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Box icon={HardDriveDownloadIcon} title="Nightly backups" sub="pg_dump · 14-day rotation" />
        <Box icon={KeyRoundIcon} title="Secrets" sub="generated on first boot" />
        <Box icon={ShieldCheckIcon} title="Firewall" sub="80 / 443 only · SSH keys" />
      </div>
      <figcaption className="mt-4 font-mono text-[0.6875rem] text-ink-3">infra/oracle/setup.sh · infra/docker-compose.yml · infra/Caddyfile · infra/terraform (AWS)</figcaption>
    </figure>
  );
}
