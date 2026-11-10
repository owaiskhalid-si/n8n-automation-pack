"use client";

import { useState } from "react";
import { AlertTriangleIcon, ArrowDownRightIcon, ArrowUpRightIcon, CheckCircle2Icon, CopyIcon, CheckIcon, UserRoundIcon } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any -- results are JSON from n8n; each renderer reads fields defensively */
type Data = any;

const money = (n: unknown, currency = "CAD") =>
  typeof n === "number" ? new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(n) : "—";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-base font-semibold">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-bg-2 px-3 text-xs font-medium transition-colors hover:bg-ink hover:text-bg"
    >
      {done ? <CheckIcon className="size-3.5 text-good" /> : <CopyIcon className="size-3.5" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function Pill({ tone = "neutral", children }: { tone?: "good" | "bad" | "warn" | "neutral" | "info"; children: React.ReactNode }) {
  // Monochrome status: ink dot = fine, faint dot = careful, cobalt dot = look here.
  const dot = { good: "bg-ink", bad: "live-dot bg-signal", warn: "bg-ink/35", info: null, neutral: null }[tone];
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-bg-2 px-3 text-xs font-medium capitalize ${tone === "bad" ? "text-signal-text" : ""}`}>
      {dot && <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />}
      {children}
    </span>
  );
}

function Prose({ text }: { text?: string }) {
  return <p className="rounded-[1.25rem] bg-bg-2 p-4 text-sm leading-relaxed whitespace-pre-line text-ink">{text || "—"}</p>;
}

function List({ items, icon }: { items?: string[]; icon?: React.ReactNode }) {
  return (
    <ul className="space-y-1.5 text-sm text-ink-2">
      {(items ?? []).map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 shrink-0">{icon ?? <span className="text-ink-3">—</span>}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── 01 Lead qualifier ──────────────────────────────────────────────────────
function LeadResult({ d }: { d: Data }) {
  const score = Number(d.score ?? 0);
  const tone = d.tier === "hot" ? "bad" : d.tier === "warm" ? "warn" : "info";
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 84 84" className="size-24 shrink-0 -rotate-90" role="img" aria-label={`Score ${score} out of 100`}>
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="7" />
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--signal)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
          <text x="42" y="42" dy="0.35em" textAnchor="middle" className="rotate-90 fill-ink text-[22px] font-semibold" style={{ transformOrigin: "42px 42px" }}>
            {score}
          </text>
        </svg>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={tone}>{d.tier} lead</Pill>
            <Pill>budget {d.budgetFit}</Pill>
            <Pill tone={d.isDecisionMaker ? "good" : "neutral"}>{d.isDecisionMaker ? "decision maker" : "influencer"}</Pill>
          </div>
          <p className="text-sm leading-relaxed text-ink">{d.intent}</p>
        </div>
      </div>
      <Section title="Why this score">
        <List items={d.reasons} icon={<CheckIcon className="size-3.5 text-amber" />} />
      </Section>
      {d.servicesNeeded?.length > 0 && (
        <Section title="Services needed">
          <div className="flex flex-wrap gap-1.5">
            {d.servicesNeeded.map((s: string) => (
              <Pill key={s}>{s}</Pill>
            ))}
          </div>
        </Section>
      )}
      <Section title="Next action">
        <p className="text-sm text-ink">{d.nextAction}</p>
      </Section>
      <Section title="Reply draft" action={<CopyButton text={d.replyDraft ?? ""} />}>
        <Prose text={d.replyDraft} />
      </Section>
    </div>
  );
}

// ─── 02 Invoice extractor ───────────────────────────────────────────────────
function InvoiceResult({ d }: { d: Data }) {
  const inv = d.invoice ?? {};
  const v = d.validation ?? {};
  const cur = inv.currency || "CAD";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{inv.vendorName ?? "Unknown vendor"}</p>
          <p className="font-mono text-xs text-ink-3">
            {inv.invoiceNumber ?? "no number"} · {inv.invoiceDate ?? "no date"}
            {inv.dueDate ? ` · due ${inv.dueDate}` : ""}
            {inv.vendorTaxNumber ? ` · ${inv.vendorTaxNumber}` : ""}
          </p>
        </div>
        {v.status === "ok" ? (
          <Pill tone="good">
            <CheckCircle2Icon className="size-3.5" /> Totals reconcile
          </Pill>
        ) : (
          <Pill tone="warn">
            <AlertTriangleIcon className="size-3.5" /> Needs review
          </Pill>
        )}
      </div>
      <div className="overflow-hidden rounded-[1.25rem] bg-bg-2">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-3">
            <tr>
              <th className="px-4 pt-3 pb-2 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {(inv.lineItems ?? []).map((l: Data, i: number) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-2">{l.description}</td>
                <td className="px-3 py-2 text-right text-ink-2">{l.quantity ?? "—"}</td>
                <td className="px-3 py-2 text-right">{money(l.amount, cur)}</td>
              </tr>
            ))}
            <tr className="border-t border-line text-ink-2">
              <td className="px-3 py-2" colSpan={2}>
                Subtotal
              </td>
              <td className="px-3 py-2 text-right">{money(inv.subtotal, cur)}</td>
            </tr>
            {(inv.taxes ?? []).map((t: Data, i: number) => (
              <tr key={`t${i}`} className="text-ink-2">
                <td className="px-3 py-1.5" colSpan={2}>
                  {t.type}
                  {t.rate ? ` ${t.rate}%` : ""}
                </td>
                <td className="px-3 py-1.5 text-right">{money(t.amount, cur)}</td>
              </tr>
            ))}
            <tr className="border-t border-line-2 font-semibold">
              <td className="px-3 py-2" colSpan={2}>
                Total {cur}
              </td>
              <td className="px-3 py-2 text-right">{money(inv.total, cur)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Pill>{inv.documentType}</Pill>
        <Pill tone="info">{inv.category}</Pill>
        <Pill tone={inv.paymentStatus === "paid" ? "good" : "neutral"}>{inv.paymentStatus}</Pill>
      </div>
      {v.issues?.length > 0 && (
        <Section title="Validation issues">
          <List items={v.issues} icon={<AlertTriangleIcon className="size-3.5 text-amber" />} />
        </Section>
      )}
    </div>
  );
}

// ─── 03 Support triage ──────────────────────────────────────────────────────
function TriageResult({ d }: { d: Data }) {
  const urgencyTone = d.urgency === "critical" || d.urgency === "high" ? "bad" : d.urgency === "normal" ? "warn" : "neutral";
  const sentimentTone = d.sentiment === "positive" ? "good" : d.sentiment === "neutral" ? "neutral" : "bad";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone="info">{String(d.category ?? "").replace("_", " ")}</Pill>
        <Pill tone={urgencyTone}>{d.urgency} urgency</Pill>
        <Pill tone={sentimentTone}>{d.sentiment}</Pill>
        {d.needsHuman && (
          <Pill tone="warn">
            <UserRoundIcon className="size-3.5" /> needs a human
          </Pill>
        )}
      </div>
      <Section title="Summary">
        <p className="text-sm text-ink">{d.summary}</p>
        {d.customerGoal && <p className="mt-1 text-sm text-ink-3">Goal: {d.customerGoal}</p>}
      </Section>
      <Section title="Routing">
        <p className="text-sm text-ink-2">
          {d.category === "spam"
            ? "Marked as read and archived — no reply."
            : urgencyTone === "bad" || d.sentiment === "angry"
              ? "Escalated to #support on Slack, then a draft reply is added to the Gmail thread."
              : "Draft reply added to the Gmail thread for an agent to review."}
        </p>
      </Section>
      {d.suggestedReply && (
        <Section title="Draft reply" action={<CopyButton text={d.suggestedReply} />}>
          <Prose text={d.suggestedReply} />
        </Section>
      )}
      {d.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {d.tags.map((t: string) => (
            <span key={t} className="font-mono text-[0.6875rem] text-ink-3">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 04 Content repurposer ──────────────────────────────────────────────────
function ContentResult({ d }: { d: Data }) {
  const tabs = [
    { id: "linkedin", label: "LinkedIn", body: d.linkedinPost as string },
    { id: "x", label: `X thread (${d.xThread?.length ?? 0})`, body: (d.xThread ?? []).join("\n\n") as string },
    { id: "newsletter", label: "Newsletter", body: d.newsletterBlurb as string },
    { id: "instagram", label: "Instagram", body: d.instagramCaption as string },
    { id: "hooks", label: "Hooks", body: (d.hooks ?? []).map((h: string, i: number) => `${i + 1}. ${h}`).join("\n") as string },
  ];
  const [tab, setTab] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === tab)!;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold">{d.headline}</p>
        <p className="mt-1 text-sm text-ink-2">{d.summary}</p>
      </div>
      <div role="tablist" className="scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-full bg-bg-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Section title={current.label} action={<CopyButton text={current.body ?? ""} />}>
        <Prose text={current.body} />
      </Section>
      {d.hashtags?.length > 0 && <p className="font-mono text-xs text-ink-3">{d.hashtags.join("  ")}</p>}
    </div>
  );
}

// ─── 05 No-show recovery ────────────────────────────────────────────────────
function NoShowResult({ d }: { d: Data }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
      <div className="mx-auto w-[220px] rounded-[32px] bg-bg-2 p-3">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-line-2" />
        <p className="mb-2 text-center text-[0.6875rem] font-medium text-ink-3">SMS · now</p>
        <div className="rounded-[22px] rounded-bl-lg bg-raised px-3.5 py-2.5 text-[0.8125rem] leading-snug text-ink">{d.sms}</div>
        <p className="mt-2 text-right text-[0.6875rem] text-ink-3 tabular">{String(d.sms ?? "").length} chars</p>
      </div>
      <div className="space-y-3">
        <Section title="Email" action={<CopyButton text={`${d.emailSubject}\n\n${d.emailBody}`} />}>
          <div className="rounded-[1.25rem] bg-bg-2">
            <p className="border-b border-line px-4 py-3 text-sm font-semibold">{d.emailSubject}</p>
            <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-ink-2">{d.emailBody}</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── 06 KPI report ──────────────────────────────────────────────────────────
function KpiResult({ d }: { d: Data }) {
  const [view, setView] = useState<"summary" | "email">("summary");
  const s = d.summary ?? {};
  const fmtValue = (k: Data) =>
    k.unit === "$" ? `$${Math.round(k.current).toLocaleString("en-CA")}` : k.unit === "%" ? `${Number(k.current).toFixed(1)}%` : Number(k.current).toLocaleString("en-CA");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-ink-3">
          {d.business} · {d.period?.from} → {d.period?.to}
        </p>
        <div className="flex h-10 gap-1 rounded-full bg-bg-2 p-1">
          {(["summary", "email"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}
            >
              {v === "email" ? "Email preview" : "Summary"}
            </button>
          ))}
        </div>
      </div>
      {view === "email" ? (
        <iframe title="HTML email report" srcDoc={d.html} sandbox="" className="h-[520px] w-full rounded-[1.25rem] bg-white" />
      ) : (
        <>
          <p className="text-lg leading-snug font-semibold">{s.headline}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(d.kpis ?? []).map((k: Data) => {
              const up = (k.changePct ?? 0) >= 0;
              const good = up === k.goodWhenUp;
              const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
              return (
                <div key={k.label} className="min-w-0 rounded-[1.25rem] bg-bg-2 px-4 py-3">
                  <p className="truncate text-xs text-ink-3">{k.label}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight tabular">{fmtValue(k)}</p>
                  {k.changePct !== null && (
                    <p className={`mt-0.5 inline-flex items-center gap-0.5 text-xs ${good ? "text-good" : "text-bad"}`}>
                      <Icon className="size-3.5" aria-hidden />
                      {Math.abs(k.changePct)}% vs last week
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm leading-relaxed text-ink-2">{s.summary}</p>
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3 [&>section]:border-t-0 [&>section]:pt-0">
            <Section title="Wins">
              <List items={s.wins} icon={<ArrowUpRightIcon className="size-3.5 text-good" />} />
            </Section>
            <Section title="Watch">
              <List items={s.risks} icon={<AlertTriangleIcon className="size-3.5 text-amber" />} />
            </Section>
            <Section title="Do this week">
              <List items={s.actions} icon={<CheckIcon className="size-3.5 text-ink-3" />} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

const renderers: Record<string, (p: { d: Data }) => React.ReactNode> = {
  "lead-qualifier": LeadResult,
  "invoice-extractor": InvoiceResult,
  "support-triage": TriageResult,
  "content-repurposer": ContentResult,
  "no-show-recovery": NoShowResult,
  "kpi-report": KpiResult,
};

export function ResultView({ slug, data }: { slug: string; data: Data }) {
  const Render = renderers[slug];
  return Render ? <Render d={data} /> : null;
}
