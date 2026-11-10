"use client";

import { useEffect, useRef, useState } from "react";
import { BracesIcon, LayoutPanelTopIcon, Loader2Icon, PlayIcon, ShieldCheckIcon } from "lucide-react";
import type { Workflow } from "@/content/workflows";
import { ResultView } from "./results";

interface RunResult {
  mode: "live" | "sample";
  ms: number;
  data: unknown;
  note?: string;
}

export function Playground({ w }: { w: Workflow }) {
  const demo = w.demo!;
  const [values, setValues] = useState<Record<string, string>>(demo.presets[0]?.values ?? {});
  const [preset, setPreset] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"result" | "json">("result");
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("running");
    setError(null);
    setElapsed(0);
    const started = performance.now();
    timer.current = setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    try {
      const res = await fetch(`/api/run/${w.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setResult(json);
      setView("result");
      setStatus("done");
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  };

  return (
    <div className="rounded-tile bg-inverse px-4 pt-7 pb-4 text-inverse-foreground sm:px-5">
      <div className="px-2 sm:px-3">
        <h2 className="text-2xl font-semibold">Try it live</h2>
        <p className="mt-1.5 text-sm text-inverse-muted">Edit the input or pick an example, then run the workflow.</p>
      </div>

      <form onSubmit={run} className="mt-6 space-y-5 px-2 sm:px-3">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Examples">
          {demo.presets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={preset === i}
              onClick={() => {
                setPreset(i);
                setValues(p.values);
              }}
              className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-medium transition-colors active:scale-[0.98] ${
                preset === i ? "bg-inverse-foreground text-inverse" : "bg-inverse-surface text-inverse-foreground/80 hover:text-inverse-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {demo.fields.map((f) => {
            const common = {
              id: `f-${f.name}`,
              name: f.name,
              value: values[f.name] ?? "",
              required: f.required,
              maxLength: f.maxLength,
              placeholder: f.placeholder,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setPreset(-1);
                setValues((v) => ({ ...v, [f.name]: e.target.value }));
              },
              className:
                "w-full bg-inverse-surface text-[0.9375rem] text-inverse-foreground outline-none transition-shadow placeholder:text-inverse-muted focus-visible:ring-2 focus-visible:ring-signal",
            };
            return (
              <label key={f.name} htmlFor={common.id} className={`flex flex-col gap-2 ${f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}`}>
                <span className="px-1 text-sm font-medium">
                  {f.label}
                  {f.required && <span className="text-inverse-muted"> *</span>}
                </span>
                {f.type === "textarea" ? (
                  <textarea {...common} rows={f.rows ?? 4} className={`${common.className} resize-y rounded-3xl px-5 py-4 font-mono text-[0.8125rem] leading-relaxed`} />
                ) : (
                  <input
                    {...common}
                    type={f.type === "number" ? "number" : f.type}
                    min={f.type === "number" ? 0 : undefined}
                    className={`${common.className} h-12 rounded-full px-5`}
                  />
                )}
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-2 px-1 text-xs text-inverse-muted">
            <ShieldCheckIcon className="size-4" aria-hidden /> Demo mode: nothing is emailed, posted or saved.
          </p>
          <button
            type="submit"
            disabled={status === "running"}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-inverse-foreground px-6 text-sm font-medium text-inverse transition-colors hover:bg-inverse-foreground/85 active:scale-[0.98] disabled:opacity-70"
          >
            {status === "running" ? (
              <>
                <Loader2Icon className="size-4 animate-spin" aria-hidden /> Running… <span className="tabular">{elapsed.toFixed(1)}s</span>
              </>
            ) : (
              <>
                <PlayIcon className="size-4" aria-hidden /> {demo.submitLabel}
              </>
            )}
          </button>
        </div>
      </form>

      <div ref={resultRef} aria-live="polite">
        {status === "error" && error && (
          <p className="mx-2 mt-5 flex items-start gap-2.5 rounded-[1.25rem] bg-inverse-surface px-4 py-3 text-sm sm:mx-3">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-signal" aria-hidden /> {error}
          </p>
        )}

        {result && status !== "running" && (
          <div className="mt-5 rounded-[1.9rem] bg-bg text-ink">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <div className="flex items-center gap-2 text-xs">
                {result.mode === "live" ? (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 font-medium">
                    <span className="live-dot size-1.5 rounded-full bg-signal" /> Live run
                  </span>
                ) : (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 font-medium">
                    <span className="size-1.5 rounded-full bg-ink/35" /> Recorded sample
                  </span>
                )}
                <span className="text-ink-3 tabular">200 · {(result.ms / 1000).toFixed(2)}s</span>
              </div>
              <div className="flex h-10 gap-1 rounded-full bg-surface p-1" role="radiogroup" aria-label="Result view">
                {(
                  [
                    ["result", "Result", LayoutPanelTopIcon],
                    ["json", "JSON", BracesIcon],
                  ] as const
                ).map(([v, label, Icon]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={view === v}
                    onClick={() => setView(v)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors ${view === v ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}
                  >
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>
            {result.note && <p className="px-5 pt-3 text-xs text-ink-3">{result.note}</p>}
            <div className="p-5">
              {view === "result" ? (
                <ResultView slug={w.slug} data={result.data} />
              ) : (
                <pre className="max-h-[520px] overflow-auto rounded-[1.25rem] bg-bg-2 p-4 font-mono text-[0.75rem] leading-relaxed text-ink-2">
                  {JSON.stringify(result.data, (k, v) => (k === "html" ? `<${String(v).length} chars of HTML>` : v), 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
