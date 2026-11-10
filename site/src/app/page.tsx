import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BoxesIcon,
  CloudIcon,
  DatabaseIcon,
  HardDriveDownloadIcon,
  KeyRoundIcon,
  LockIcon,
  PlayIcon,
  ServerIcon,
  ShieldCheckIcon,
  TerminalIcon,
  WorkflowIcon,
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

const hosting = [
  "Automatic HTTPS with Caddy + Let's Encrypt — a free sslip.io or DuckDNS hostname is enough",
  "Secrets generated on the server, never committed",
  "Nightly Postgres + workflow backups, 14-day rotation (S3 optional)",
  "Editor lockable to your office IP; webhooks stay public",
  "Firewall open on 80/443 only, swap file, unattended security updates",
  "The same Compose stack runs on any VPS — Oracle, AWS, Hetzner, a home server",
];

// Unsplash serves it resized and compressed, so it skips Next's optimiser (no upstream timeouts, no image quota).
const HERO_PHOTO = {
  src: "https://images.unsplash.com/photo-1765371515218-0a4c992ba8e2?auto=format&fit=crop&w=1800&q=75",
  alt: "A warm, wood-panelled office with a shared desk and two monitors",
};

export default function Home() {
  const demos = workflows.filter((w) => w.demo).length;
  const nodes = workflows.reduce((s, w) => s + w.nodes, 0);
  const stats = [
    [String(workflows.length), "production workflows"],
    [String(demos), "live demos"],
    [String(nodes), "nodes, all schema-validated"],
    ["$0", "a month to self-host"],
  ];
  return (
    <div className="grid gap-5">
      {/* Headline band */}
      <section className="grid gap-6 pt-6 pb-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:pt-10">
        <div className="animate-rise">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium">
            <span className="size-1.5 rounded-full bg-signal" aria-hidden />
            n8n automation pack · Gemini inside
          </span>
          <h1 className="mt-5 font-display text-[3rem] leading-[1] tracking-[-0.03em] sm:text-[4.25rem] xl:text-[5rem]">
            Automations that do the busywork.
            <span className="block text-ink/45">Try them live.</span>
          </h1>
        </div>
        <div className="animate-rise [animation-delay:150ms] lg:pb-2">
          <p className="text-lg text-ink-3">
            Seven production-ready n8n workflows: lead qualification, invoice extraction, support triage, content repurposing, booking reminders and KPI
            reports. Each one tested end-to-end and self-hosted for $0 a month on Oracle Cloud, or on AWS with Terraform.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/workflows/lead-qualifier"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-bg transition-colors hover:bg-ink/85 active:scale-[0.98]"
            >
              Run a live demo <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
            <Link
              href="#workflows"
              className="inline-flex h-12 items-center rounded-full bg-surface px-6 text-sm font-medium transition-colors hover:bg-ink/10 active:scale-[0.98]"
            >
              Browse all {workflows.length}
            </Link>
          </div>
        </div>
      </section>

      {/* Bento */}
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section className="tile-in relative min-h-[420px] overflow-hidden rounded-tile bg-surface lg:h-[540px]">
          <Image src={HERO_PHOTO.src} alt={HERO_PHOTO.alt} fill priority unoptimized className="object-cover" />
          <div className="absolute inset-x-5 top-5 flex flex-wrap items-start justify-between gap-2">
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-[#111]">
              <span className="live-dot size-1.5 rounded-full bg-signal" aria-hidden />
              Live demos
            </span>
            <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto">
              <GlassChip icon={WorkflowIcon}>{workflows.length} workflows</GlassChip>
              <GlassChip icon={PlayIcon}>{demos} you can run</GlassChip>
              <GlassChip icon={BoxesIcon}>{nodes} nodes</GlassChip>
            </div>
          </div>
          <div className="absolute bottom-5 left-5 max-w-[calc(100%-2.5rem)] rounded-callout bg-white px-4 py-2.5 text-[#111]">
            <p className="text-sm font-semibold">Busywork, handled</p>
            <p className="text-xs text-[#111]/60">Leads, invoices, support and reports run while the team works</p>
          </div>
        </section>

        <section className="tile-in flex min-w-0 flex-col overflow-hidden rounded-tile bg-inverse text-inverse-foreground [animation-delay:60ms] lg:h-[540px]">
          <div className="flex items-start justify-between gap-3 px-6 pt-8 sm:px-7">
            <div>
              <h2 className="text-2xl font-semibold">AI lead qualifier</h2>
              <p className="mt-1.5 text-sm text-inverse-muted">Webhook → Gemini → routed in under two seconds</p>
            </div>
            <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-inverse-surface px-3 text-xs font-medium">
              <span className="live-dot size-1.5 rounded-full bg-signal" aria-hidden /> Active
            </span>
          </div>
          <div className="flex flex-1 items-center px-4 py-4 sm:px-5">
            <HeroGraph />
          </div>
          <div className="rounded-panel bg-inverse-surface px-6 py-5 font-mono text-[0.72rem] leading-relaxed">
            <p>
              <span className="text-inverse-muted">POST</span> /webhook/lead-qualifier <span className="text-signal">200</span>{" "}
              <span className="text-inverse-muted">1.8s</span>
            </p>
            <p className="text-inverse-muted">
              score <span className="text-inverse-foreground">82</span> · tier <span className="text-signal">hot</span> · #sales, CRM, reply draft
              <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-signal" />
            </p>
          </div>
        </section>
      </div>

      <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {stats.map(([v, l]) => (
          <div key={l} className="rounded-tile bg-surface px-6 pt-7 pb-6 sm:px-7">
            <dt className="sr-only">{l}</dt>
            <dd>
              <span className="block font-display text-[2.5rem] leading-none tabular">{v}</span>
              <span className="mt-2 block text-sm text-ink-3">{l}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* Workflows */}
      <section id="workflows" className="scroll-mt-5 pt-14">
        <div className="max-w-2xl">
          <h2 className="font-display text-[2.25rem] leading-[1.1] text-balance sm:text-[2.75rem]">
            Real business problems, <span className="text-ink/45">wired end to end.</span>
          </h2>
          <p className="mt-3 text-base text-ink-3">Open any workflow to see its canvas, how it works, and run it live with your own input.</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((w, i) => (
            <WorkflowCard key={w.slug} w={w} wide={i === workflows.length - 1 && workflows.length % 2 === 1} />
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="scroll-mt-5 pt-14">
        <div className="max-w-2xl">
          <h2 className="font-display text-[2.25rem] leading-[1.1] text-balance sm:text-[2.75rem]">
            Workflows as code, <span className="text-ink/45">tested like software.</span>
          </h2>
          <p className="mt-3 text-base text-ink-3">Most n8n templates are exported once and hoped for. These are generated, validated and tested in CI on every change.</p>
        </div>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {pipeline.map((p, i) => (
            <li key={p.title} className="flex min-w-0 flex-col rounded-tile bg-surface px-6 pt-7 pb-7 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-raised text-xl font-semibold tabular">{i + 1}</span>
                <code className="truncate rounded-full bg-raised px-3 py-1.5 font-mono text-[0.6875rem] text-ink-3">{p.file}</code>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Hosting */}
      <section id="hosting" className="scroll-mt-5 pt-14">
        <div className="max-w-2xl">
          <h2 className="font-display text-[2.25rem] leading-[1.1] text-balance sm:text-[2.75rem]">
            Self-hosted for $0 a month, <span className="text-ink/45">in one script.</span>
          </h2>
          <p className="mt-3 text-base text-ink-3">
            The live demo runs on an Oracle Cloud <strong className="font-semibold text-ink">Always Free</strong> Ampere VM: 4 cores, 24 GB of RAM, no bill.
            One script installs Docker, generates the secrets and brings up n8n, Postgres and Caddy. Prefer AWS? Terraform for a Graviton instance in
            ca-central-1 is included.
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex min-w-0 flex-col rounded-tile bg-surface px-5 pt-7 pb-6 sm:px-7">
            <h3 className="text-2xl font-semibold">What the script sets up</h3>
            <ul className="mt-5 grid gap-2">
              {hosting.map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-[1.25rem] bg-raised px-4 py-3 text-sm">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ink" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <pre className="mt-5 overflow-x-auto rounded-[1.75rem] bg-raised p-5 font-mono text-[0.75rem] leading-relaxed text-ink-2">
              <code>
                <span className="text-ink-3">$</span> git clone https://github.com/…/n8n-automation-pack{"\n"}
                <span className="text-ink-3">$</span> sudo bash n8n-automation-pack/infra/oracle/setup.sh \{"\n"}
                {"    "}--domain n8n.yourco.ca --email ops@yourco.ca{"\n"}
                <span className="text-signal-text">✓ n8n is starting at https://n8n.yourco.ca</span>
              </code>
            </pre>
          </div>
          <ArchitectureDiagram />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-9 flex flex-wrap items-end justify-between gap-8 rounded-tile bg-surface px-6 py-12 sm:px-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-[2rem] leading-[1.1] sm:text-[2.75rem]">
            Want automations like these <span className="text-ink/45">running in your business?</span>
          </h2>
          <p className="mt-4 text-base text-ink-3">
            Every workflow here is a starting point: connected to your CRM, inbox, booking system or database, with your prompts and your rules.
          </p>
        </div>
        {site.repoUrl && (
          <a
            href={site.repoUrl}
            className="inline-flex h-[52px] items-center gap-2 rounded-full bg-ink px-8 text-sm font-medium tracking-wide text-bg uppercase transition-colors hover:bg-ink/85 active:scale-[0.98]"
          >
            Get the templates <ArrowRightIcon className="size-4" aria-hidden />
          </a>
        )}
      </section>
    </div>
  );
}

function GlassChip({ icon: Icon, children }: { icon: typeof ServerIcon; children: React.ReactNode }) {
  return (
    <span className="glass inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-[18px] text-sm font-medium whitespace-nowrap text-[#111]">
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      {children}
    </span>
  );
}

function Box({ icon: Icon, title, sub, className }: { icon: typeof ServerIcon; title: string; sub: string; className?: string }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-full bg-raised p-2 pr-5 ${className ?? ""}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg">
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-ink-3">{sub}</span>
      </span>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <figure className="min-w-0 rounded-tile bg-surface px-5 pt-7 pb-6 sm:px-7" aria-label="Hosting architecture">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold">Architecture</h3>
          <p className="mt-1.5 text-sm text-ink-3">Oracle Cloud · Always Free</p>
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-raised px-3.5 text-xs font-medium">$0 / month</span>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Box icon={CloudIcon} title="This site" sub="Vercel · Next.js" />
        <Box icon={TerminalIcon} title="Your apps" sub="forms · CRM · booking" />
      </div>
      <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-ink-3">
        <svg viewBox="0 0 12 36" className="h-9 w-3" aria-hidden>
          <path d="M6 0v30" stroke="var(--signal)" strokeWidth="1.5" className="wire-flow" />
          <path d="M1 28l5 6 5-6" fill="none" stroke="var(--signal)" strokeWidth="1.5" />
        </svg>
        HTTPS · webhooks
      </div>
      <div className="rounded-[1.75rem] bg-raised/50 p-3 ring-1 ring-ink/10 ring-inset">
        <p className="mb-3 flex flex-wrap items-center justify-between gap-x-3 px-2 pt-1 text-xs text-ink-3">
          <span className="font-medium text-ink">Ampere A1 VM · Docker Compose</span>
          <span>4 OCPU · 24 GB · ARM64</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Box icon={LockIcon} title="Caddy" sub="TLS · IP allowlist" />
          <Box icon={ServerIcon} title="n8n 2.40" sub="task runners" />
          <Box icon={DatabaseIcon} title="Postgres 16" sub="state · history" />
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Box icon={HardDriveDownloadIcon} title="Nightly backups" sub="pg_dump · 14-day rotation" />
        <Box icon={KeyRoundIcon} title="Secrets" sub="generated on first boot" />
        <Box icon={ShieldCheckIcon} title="Firewall" sub="80 / 443 only · SSH keys" />
      </div>
      <figcaption className="mt-5 font-mono text-[0.6875rem] leading-relaxed text-ink-3">
        infra/oracle/setup.sh · infra/docker-compose.yml · infra/Caddyfile · infra/terraform (AWS)
      </figcaption>
    </figure>
  );
}
