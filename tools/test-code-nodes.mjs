// Unit tests for the JavaScript inside Code nodes, run outside n8n with the same
// globals ($json, $input, $, DateTime) so logic bugs are caught before import.
import { readFileSync } from "node:fs";
import { DateTime } from "luxon";
const dir = new URL("../workflows/", import.meta.url);
const wf = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
const codeOf = (w, name) => w.nodes.find((n) => n.name === name).parameters.jsCode;
const run = (js, ctx) => new Function("$json", "$input", "$", "DateTime", "$now", js)(ctx.$json, ctx.$input, ctx.$, DateTime, DateTime.now());
let failures = 0;
const ok = (c, m) => {
  if (!c) failures++;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

// KPI report: sample data → KPIs → HTML
const kpi = wf("06-weekly-kpi-report.json");
const sample = run(codeOf(kpi, "Posted or sample data"), { $json: { body: { demo: true } } })[0].json;
ok(sample.days.length === 14 && sample.demo === true, `sample data: 14 days for ${sample.business}`);
const k = run(codeOf(kpi, "Compute KPIs"), { $json: sample })[0].json;
ok(k.kpis.length === 6 && k.kpis.every((m) => Number.isFinite(m.current)), "KPIs computed: " + k.kpis.map((m) => `${m.label} ${m.changePct}%`).join(", "));
const summary = { headline: "Revenue up 9% on stronger weekends", summary: "…", wins: ["a"], risks: ["b"], actions: ["c", "d", "e"] };
const html = run(codeOf(kpi, "Render HTML report"), { $json: { output: summary }, $: () => ({ first: () => ({ json: k }) }) })[0].json.html;
ok(html.includes("<table") && html.includes("Revenue up 9%"), `HTML report rendered (${html.length} chars)`);
const rows = [{ json: { day: "2026-09-01", revenue: "1200.50", orders: "31", new_customers: "10", refunds: "0", visitors: "900" } }];
const folded = run(codeOf(kpi, "Rows → days"), { $input: { all: () => rows } })[0].json;
ok(folded.days[0].revenue === 1200.5 && folded.days[0].date === "2026-09-01", "Postgres rows folded into days");

// Invoice validation
const inv = wf("02-invoice-receipt-extractor.json");
const doc = { source: "webhook", fileName: "x", demo: true, receivedAt: "now" };
const good = run(codeOf(inv, "Validate totals"), {
  $json: { output: { vendorName: "Acme", invoiceDate: "2026-09-01", subtotal: 100, total: 113, taxes: [{ type: "HST", rate: 13, amount: 13 }], lineItems: [{ description: "a", amount: 60 }, { description: "b", amount: 40 }] } },
  $: () => ({ item: { json: doc } }),
}).json;
ok(good.validation.status === "ok", "consistent invoice passes validation");
const bad = run(codeOf(inv, "Validate totals"), {
  $json: { output: { vendorName: "Acme", invoiceDate: null, subtotal: 100, total: 120, taxes: [{ type: "GST", rate: 5, amount: 5 }], lineItems: [{ description: "a", amount: 90 }] } },
  $: () => ({ item: { json: doc } }),
}).json;
ok(bad.validation.status === "needs_review" && bad.validation.issues.length === 3, "bad invoice flagged: " + bad.validation.issues.join(" | "));

// Reminder picker
const rem = wf("05-appointment-reminders-no-show-recovery.json");
const now = DateTime.now();
const appts = [
  { id: "a1", customerName: "Priya Shah", phone: "+14165550101", service: "Cleaning", staffName: "Dr. Lee", startsAt: now.plus({ hours: 20 }).toISO(), status: "confirmed" },
  { id: "a2", customerName: "Tom Roy", email: "tom@example.com", service: "Check-up", staffName: "Dr. Lee", startsAt: now.plus({ hours: 1.5 }).toISO(), status: "confirmed", reminder24hSentAt: "x" },
  { id: "a3", customerName: "Done Already", phone: "+1", service: "X", staffName: "Y", startsAt: now.plus({ hours: 10 }).toISO(), status: "confirmed", reminder24hSentAt: "x" },
  { id: "a4", customerName: "Cancelled", phone: "+1", service: "X", staffName: "Y", startsAt: now.plus({ hours: 5 }).toISO(), status: "cancelled" },
];
const cfg = { businessName: "Maple Dental", timezone: "America/Toronto", manageUrl: "https://x/manage" };
const due = run(codeOf(rem, "Pick reminders due"), { $input: { all: () => appts.map((json) => ({ json })) }, $: () => ({ first: () => ({ json: cfg }) }) });
ok(due.length === 2 && due[0].json.reminderType === "24h" && due[0].json.channel === "sms" && due[1].json.reminderType === "2h" && due[1].json.channel === "email", "reminders: " + due.map((d) => `${d.json.appointmentId}:${d.json.reminderType}/${d.json.channel}`).join(", "));
console.log("   sample SMS:", due[0].json.message);

if (failures) process.exit(1);
