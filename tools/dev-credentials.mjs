// Creates placeholder credentials on a LOCAL dev n8n so imported templates render
// without "missing credentials" warnings. Never point this at a real instance.
// Re-running reuses credentials that already exist with the same name and type.
//   node --env-file=infra/.env.local-dev tools/dev-credentials.mjs
import { writeFile } from "node:fs/promises";

const base = process.env.N8N_DEV_URL;
if (!base?.includes("localhost")) throw new Error("Refusing to run against a non-local n8n");

const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ emailOrLdapLoginId: process.env.N8N_DEV_EMAIL, password: process.env.N8N_DEV_PASSWORD }),
});
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

const wanted = [
  ["@n8n/n8n-nodes-langchain.lmChatGoogleGemini", "googlePalmApi", "Google Gemini account", { host: "https://generativelanguage.googleapis.com", apiKey: "local-placeholder" }],
  ["@n8n/n8n-nodes-langchain.lmChatAnthropic", "anthropicApi", "Anthropic account", { apiKey: "sk-ant-local-placeholder" }],
  ["n8n-nodes-base.googleSheets", "googleSheetsOAuth2Api", "Google Sheets account", { clientId: "placeholder", clientSecret: "placeholder" }],
  ["n8n-nodes-base.slack", "slackApi", "Slack account", { accessToken: "xoxb-local-placeholder" }],
  ["n8n-nodes-base.gmail", "gmailOAuth2", "Gmail account", { clientId: "placeholder", clientSecret: "placeholder" }],
  ["n8n-nodes-base.twilio", "twilioApi", "Twilio account", { accountSid: "AC00000000000000000000000000000000", authToken: "placeholder" }],
  ["n8n-nodes-base.emailSend", "smtp", "SMTP account", { user: "placeholder", password: "placeholder", host: "smtp.example.com", port: 587, secure: false }],
  ["n8n-nodes-base.postgres", "postgres", "Postgres account", { host: "db.example.com", database: "shop", user: "readonly", password: "placeholder", port: 5432 }],
  ["n8n-nodes-base.httpRequest", "httpHeaderAuth", "Booking API key", { name: "Authorization", value: "Bearer placeholder" }],
];

const existingRes = await fetch(`${base}/rest/credentials`, { headers: { cookie } });
const existing = existingRes.ok ? ((await existingRes.json()).data ?? []) : [];

const map = {};
for (const [nodeType, type, name, data] of wanted) {
  const found = existing.find((c) => c.name === name && c.type === type);
  if (found) {
    map[nodeType] = { type, id: found.id, name };
    console.log(`= ${name} (exists)`);
    continue;
  }
  const res = await fetch(`${base}/rest/credentials`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name, type, data }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${type}: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  map[nodeType] = { type, id: body.data.id, name };
  console.log(`✓ ${name}`);
}
map["n8n-nodes-base.gmailTrigger"] = map["n8n-nodes-base.gmail"];
await writeFile("infra/credentials.local.json", JSON.stringify(map, null, 2));
console.log("Wrote infra/credentials.local.json");
