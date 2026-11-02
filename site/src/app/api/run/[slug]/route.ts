import { bySlug } from "@/content/workflows";
import { samples } from "@/content/samples";
import { schemaFor } from "@/lib/demo-schema";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export interface RunResponse {
  mode: "live" | "sample";
  ms: number;
  data: unknown;
  note?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a workflow demo. Forwards validated input to the n8n webhook (always with
 * `demo: true`, so no emails, Slack messages or sheet rows are created). When no
 * backend is configured, returns a recorded response instead.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/run/[slug]">) {
  const { slug } = await ctx.params;
  const doc = bySlug(slug);
  if (!doc?.demo) return Response.json({ error: "Unknown workflow" }, { status: 404 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const limit = rateLimit(`${ip}:${slug}`);
  if (!limit.ok) {
    return Response.json(
      { error: `Demo limit reached — try again in ${Math.ceil(limit.retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schemaFor(doc).safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const started = Date.now();
  const base = process.env.N8N_WEBHOOK_BASE?.replace(/\/$/, "");
  const sample = (note: string): RunResponse => ({ mode: "sample", ms: Date.now() - started, data: samples[slug], note });

  if (!base) {
    await sleep(650 + Math.random() * 600);
    return Response.json(sample("Live backend not connected — showing a recorded run of this workflow."));
  }

  try {
    const res = await fetch(`${base}/webhook/${slug}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.N8N_DEMO_KEY ? { "X-Demo-Key": process.env.N8N_DEMO_KEY } : {}),
      },
      body: JSON.stringify({ ...parsed.data, demo: true }),
      signal: AbortSignal.timeout(55_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`n8n responded ${res.status}`);
    const data = await res.json();
    return Response.json({ mode: "live", ms: Date.now() - started, data } satisfies RunResponse);
  } catch (err) {
    console.error(`[run:${slug}]`, err);
    return Response.json(sample("The live n8n instance isn't reachable right now — showing a recorded run instead."));
  }
}
