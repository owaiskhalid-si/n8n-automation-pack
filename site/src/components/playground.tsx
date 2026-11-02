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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="label">Try it live</p>
          <p className="mt-1 text-sm text-ink-2">Edit the input or pick an example, then run the workflow.</p>
        </div>
      </div>

      <form onSubmit={run} className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Examples">
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
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                preset === i ? "border-amber-fill bg-amber-fill/10 text-ink" : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
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
                "w-full rounded-xl border border-line bg-bg-2 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-amber-fill",
            };
            return (
              <label key={f.name} htmlFor={common.id} className={`flex flex-col gap-1.5 ${f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}`}>
                <span className="text-xs font-medium text-ink-2">
                  {f.label}
                  {f.required && <span className="text-amber"> *</span>}
                </span>
                {f.type === "textarea" ? (
                  <textarea {...common} rows={f.rows ?? 4} className={`${common.className} resize-y font-mono text-[0.8125rem] leading-relaxed`} />
                ) : (
                  <input {...common} type={f.type === "number" ? "number" : f.type} min={f.type === "number" ? 0 : undefined} />
                )}
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <ShieldCheckIcon className="size-3.5 text-good" aria-hidden /> Demo mode: nothing is emailed, posted or saved.
          </p>
          <button
            type="submit"
            disabled={status === "running"}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-fill px-4 text-sm font-semibold text-amber-ink transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
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
        {status === "error" && error && <p className="mx-5 mb-5 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}

        {result && status !== "running" && (
          <div className="border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-2 px-5 py-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                {result.mode === "live" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-good/10 px-2 py-0.5 text-good">
                    <span className="size-1.5 rounded-full bg-good" /> LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-fill/10 px-2 py-0.5 text-amber">
                    <span className="size-1.5 rounded-full bg-amber-fill" /> RECORDED SAMPLE
                  </span>
                )}
                <span className="text-ink-3">200 · {(result.ms / 1000).toFixed(2)}s</span>
              </div>
              <div className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setView("result")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${view === "result" ? "bg-raised text-ink" : "text-ink-3"}`}
                >
                  <LayoutPanelTopIcon className="size-3.5" aria-hidden /> Result
                </button>
                <button
                  type="button"
                  onClick={() => setView("json")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${view === "json" ? "bg-raised text-ink" : "text-ink-3"}`}
                >
                  <BracesIcon className="size-3.5" aria-hidden /> JSON
                </button>
              </div>
            </div>
            {result.note && <p className="border-b border-line px-5 py-2.5 text-xs text-ink-3">{result.note}</p>}
            <div className="p-5">
              {view === "result" ? (
                <ResultView slug={w.slug} data={result.data} />
              ) : (
                <pre className="max-h-[520px] overflow-auto rounded-xl border border-line bg-bg-2 p-4 font-mono text-[0.75rem] leading-relaxed text-ink-2">
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
