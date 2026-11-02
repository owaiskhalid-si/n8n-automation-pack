// End-to-end test: import every workflow into a running n8n container, publish
// the webhook workflows, point the chat-model credential at the mock LLM API,
// then call each webhook the way the gallery site does and check the response shape.
//
//   node tools/e2e/mock-llm.mjs &                      # terminal 1
//   node --env-file=infra/.env.local-dev tools/e2e/run.mjs
//
// Flags:
//   --live    leave the credential as set in the n8n UI (real Gemini key, no mock)
//   --record  save each passing response as the gallery site's sample (site/src/content/samples)
//
// Env: N8N_DEV_URL, N8N_DEV_EMAIL, N8N_DEV_PASSWORD, N8N_CONTAINER (default n8n-dev),
//      MOCK_LLM_URL (default http://host.docker.internal:5699)
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.N8N_DEV_URL ?? "http://localhost:5690";
const container = process.env.N8N_CONTAINER ?? "n8n-dev";
const mockUrl = process.env.MOCK_LLM_URL ?? process.env.MOCK_ANTHROPIC_URL ?? "http://host.docker.internal:5699";
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login() {
  const res = await fetch(`${base}/rest/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ emailOrLdapLoginId: process.env.N8N_DEV_EMAIL, password: process.env.N8N_DEV_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed (${res.status})`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function waitForN8n() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("n8n did not become healthy");
}

// --live: keep the chat-model credential as configured in the n8n UI (a real key) and
// call the real API instead of the mock.
const live = process.argv.includes("--live");
const record = process.argv.includes("--record");
let lastJson = null;

// 1 · Mock mode: the chat models use separate "<name> (mock)" credentials pointed at the
//     mock server, so the real key on e.g. "Google Gemini account" is never overwritten.
//     Each provider's credential has its own field for the base URL.
const creds = JSON.parse(await readFile("infra/credentials.local.json", "utf8"));
const mockData = {
  "@n8n/n8n-nodes-langchain.lmChatGoogleGemini": { apiKey: "mock-key", host: mockUrl },
  "@n8n/n8n-nodes-langchain.lmChatAnthropic": { apiKey: "mock-key", url: mockUrl },
};
let credsFile = "infra/credentials.local.json";
if (!live) {
  const cookie = await login();
  const list = await fetch(`${base}/rest/credentials`, { headers: { cookie } });
  const existing = list.ok ? ((await list.json()).data ?? []) : [];
  const mockCreds = { ...creds };
  let saved = 0;
  for (const [nodeType, data] of Object.entries(mockData)) {
    const real = creds[nodeType];
    if (!real) continue;
    const name = `${real.name} (mock)`;
    const found = existing.find((c) => c.name === name && c.type === real.type);
    const res = await fetch(found ? `${base}/rest/credentials/${found.id}` : `${base}/rest/credentials`, {
      method: found ? "PATCH" : "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name, type: real.type, data }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`could not save ${name}: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
    mockCreds[nodeType] = { type: real.type, id: found?.id ?? body.data.id, name };
    saved++;
  }
  if (!saved) throw new Error("No chat-model credential in infra/credentials.local.json — run tools/dev-credentials.mjs first");
  credsFile = "dist/credentials.mock.json";
  await mkdir("dist", { recursive: true });
  await writeFile(credsFile, JSON.stringify(mockCreds, null, 2));
}

// 2 · Build with credential IDs (real ones for --live, the mock ones otherwise), import and publish
sh("node", ["tools/build.mjs", "--out", "dist/e2e", "--credentials", credsFile]);
sh("docker", ["exec", container, "sh", "-c", "rm -rf /tmp/wf && mkdir -p /tmp/wf"]);
const files = (await readdir("dist/e2e")).filter((f) => /^\d.*\.json$/.test(f));
for (const f of files) {
  sh("docker", ["cp", join("dist/e2e", f), `${container}:/tmp/wf/${f}`]);
  sh("docker", ["exec", container, "n8n", "import:workflow", `--input=/tmp/wf/${f}`]);
  const wf = JSON.parse(await readFile(join("dist/e2e", f), "utf8"));
  if (wf.nodes.some((n) => n.type === "n8n-nodes-base.webhook")) sh("docker", ["exec", container, "n8n", "publish:workflow", `--id=${wf.id}`]);
}
console.log(`Imported ${files.length} workflows; restarting n8n to register webhooks…`);
sh("docker", ["restart", container]);
await waitForN8n();
// /healthz goes green a few seconds before the webhooks are registered. Probe one with GET:
// Express answers "Cannot GET" (HTML) until n8n has registered it, then n8n answers a JSON 404
// ("not registered for GET requests") without running the workflow.
for (let i = 0; ; i++) {
  const res = await fetch(`${base}/webhook/lead-qualifier`).catch(() => null);
  if ((res?.headers.get("content-type") ?? "").includes("json")) break;
  if (i >= 120) throw new Error("n8n did not register its webhooks after the restart");
  await sleep(1000);
}

// 3 · Call each webhook like the gallery site does
const cases = [
  {
    path: "lead-qualifier",
    body: { name: "Sarah Chen", email: "sarah@mapledental.ca", company: "Maple Dental", role: "Owner", budget: "CA$15k", timeline: "6 weeks", message: "We need online booking with SMS reminders for 3 clinics." },
    expect: (r) => typeof r.score === "number" && ["hot", "warm", "cold"].includes(r.tier) && r.replyDraft && r.lead?.name === "Sarah Chen",
  },
  {
    path: "invoice-extractor",
    body: { text: "NORTHWIND OFFICE SUPPLY LTD.\nGST/HST 123456789 RT0001\nInvoice INV-20417        Date: 2026-09-14        Due: 2026-10-14\n\n2 x Ergonomic office chair   @ 180.00   360.00\n2 x Desk lamp               @  30.00    60.00\n\nSubtotal                               420.00\nHST 13%                                 54.60\nTOTAL (CAD)                            474.60" },
    expect: (r) => r.invoice?.vendorName && r.validation?.status === "ok" && r.validation.taxTotal === 54.6,
  },
  {
    path: "support-triage",
    body: { from: "marc@example.com", fromName: "Marc", subject: "Charged twice", body: "I was billed twice for September. Please fix this." },
    expect: (r) => r.category && r.urgency && r.suggestedReply && r.subject === "Charged twice",
  },
  {
    path: "content-repurposer",
    body: { text: "Small businesses lose about six hours a week to copy-paste work between apps. Automating leads, invoices and reminders wins most of it back." },
    expect: (r) => r.linkedinPost && Array.isArray(r.xThread) && r.xThread.length > 0,
  },
  {
    path: "no-show-recovery",
    body: { customerName: "Priya Shah", service: "cleaning", businessName: "Maple Dental", previousVisits: 4 },
    expect: (r) => r.sms && r.emailSubject && r.emailBody,
  },
  {
    path: "kpi-report",
    body: {},
    expect: (r) => r.kpis?.length === 6 && r.summary?.headline && String(r.html).includes("<table"),
  },
];

let failed = 0;
for (const c of cases) {
  const started = Date.now();
  let ok = false;
  let detail = "";
  try {
    const res = await fetch(`${base}/webhook/${c.path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...c.body, demo: true }),
    });
    const json = await res.json().catch(() => ({}));
    lastJson = json;
    ok = res.ok && c.expect(json);
    detail = res.ok ? JSON.stringify(json).slice(0, 110) : `HTTP ${res.status} ${JSON.stringify(json).slice(0, 200)}`;
  } catch (e) {
    detail = String(e);
  }
  if (!ok) failed++;
  else if (record) await writeFile(join("site/src/content/samples", `${c.path}.json`), `${JSON.stringify(lastJson, null, 2)}\n`);
  console.log(`${ok ? "PASS" : "FAIL"}  /${c.path}  ${Date.now() - started}ms  ${detail}`);
}

if (failed) {
  console.error(`\n${failed} webhook test(s) failed`);
  process.exit(1);
}
console.log("\nAll webhook workflows passed end-to-end.");
