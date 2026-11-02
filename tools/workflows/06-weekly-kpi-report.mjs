import { AI, aiStep, code, condition, ifNode, MODELS, op, respond, schema, slackMessage, webhook, Workflow } from "../lib.mjs";

export const meta = {
  slug: "kpi-report",
  file: "06-weekly-kpi-report.json",
};

const rowsToDaysJs = `// Postgres returns one row per day — fold them into the shape the KPI step expects.
return [{
  json: {
    business: 'Your business',
    demo: false,
    days: $input.all().map(({ json: r }) => ({
      date: String(r.day).slice(0, 10),
      revenue: Number(r.revenue) || 0,
      orders: Number(r.orders) || 0,
      newCustomers: Number(r.new_customers) || 0,
      refunds: Number(r.refunds) || 0,
      visitors: Number(r.visitors) || 0,
    })),
  },
}];`;

const demoDataJs = `// Use posted numbers if provided, otherwise generate 14 days of realistic sample data.
const body = $json.body ?? {};
if (Array.isArray(body.days) && body.days.length >= 14) {
  return [{ json: { business: body.business || 'Your business', demo: body.demo === true, days: body.days.slice(-14) } }];
}
const seed = [...String(body.business || 'Northside Coffee Co.')].reduce((s, c) => s + c.charCodeAt(0), 0);
let x = seed;
const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
const start = DateTime.now().startOf('day').minus({ days: 14 });
const days = Array.from({ length: 14 }, (_, i) => {
  const d = start.plus({ days: i });
  const weekend = d.weekday >= 6;
  const growth = i >= 7 ? 1.08 : 1;
  const visitors = Math.round((weekend ? 2600 : 1900) * growth * (0.9 + rand() * 0.2));
  const orders = Math.round(visitors * (0.031 + rand() * 0.006));
  const aov = 38 + rand() * 9;
  return {
    date: d.toISODate(),
    visitors,
    orders,
    revenue: Math.round(orders * aov * 100) / 100,
    newCustomers: Math.round(orders * (0.35 + rand() * 0.1)),
    refunds: Math.round(orders * aov * (i === 11 ? 0.09 : 0.02) * 100) / 100,
  };
});
return [{ json: { business: body.business || 'Northside Coffee Co.', demo: body.demo === true, days } }];`;

const kpisJs = `// Week-over-week KPIs from 14 days of daily data.
const { business, demo, days } = $json;
const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
const prev = sorted.slice(-14, -7);
const curr = sorted.slice(-7);
const sum = (arr, k) => arr.reduce((s, d) => s + (Number(d[k]) || 0), 0);
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
const r2 = (n) => Math.round(n * 100) / 100;

const metric = (label, c, p, unit = '', goodWhenUp = true) => ({ label, current: r2(c), previous: r2(p), changePct: pct(c, p), unit, goodWhenUp });
const rev = sum(curr, 'revenue'), revP = sum(prev, 'revenue');
const ord = sum(curr, 'orders'), ordP = sum(prev, 'orders');
const vis = sum(curr, 'visitors'), visP = sum(prev, 'visitors');
const ref = sum(curr, 'refunds'), refP = sum(prev, 'refunds');

const kpis = [
  metric('Revenue', rev, revP, '$'),
  metric('Orders', ord, ordP),
  metric('Average order value', ord ? rev / ord : 0, ordP ? revP / ordP : 0, '$'),
  metric('New customers', sum(curr, 'newCustomers'), sum(prev, 'newCustomers')),
  metric('Conversion rate', vis ? (ord / vis) * 100 : 0, visP ? (ordP / visP) * 100 : 0, '%'),
  metric('Refund rate', rev ? (ref / rev) * 100 : 0, revP ? (refP / revP) * 100 : 0, '%', false),
];
const best = curr.reduce((a, b) => (b.revenue > a.revenue ? b : a), curr[0]);
const worst = curr.reduce((a, b) => (b.revenue < a.revenue ? b : a), curr[0]);

return [{
  json: {
    business,
    demo,
    period: { from: curr[0]?.date, to: curr[curr.length - 1]?.date },
    kpis,
    bestDay: { date: best?.date, revenue: best?.revenue },
    worstDay: { date: worst?.date, revenue: worst?.revenue },
    daily: curr.map((d) => ({ date: d.date, revenue: d.revenue, orders: d.orders })),
  },
}];`;

const renderHtmlJs = `// Inline-styled HTML so the report renders the same in Gmail, Outlook and Slack previews.
const r = $('Compute KPIs').first().json;
const s = $json.output;
const fmt = (m) => {
  const v = m.unit === '$' ? '$' + m.current.toLocaleString('en-CA', { maximumFractionDigits: 0 }) : m.unit === '%' ? m.current.toFixed(1) + '%' : m.current.toLocaleString('en-CA');
  return v;
};
const delta = (m) => {
  if (m.changePct === null) return '';
  const up = m.changePct >= 0;
  const good = up === m.goodWhenUp;
  return \`<span style="color:\${good ? '#0a7a2f' : '#b42323'}">\${up ? '▲' : '▼'} \${Math.abs(m.changePct)}%</span>\`;
};
const rows = r.kpis.map((m) => \`<tr><td style="padding:8px 0;color:#55524b">\${m.label}</td><td style="padding:8px 0;text-align:right;font-weight:600">\${fmt(m)}</td><td style="padding:8px 0 8px 12px;text-align:right;font-size:13px">\${delta(m)}</td></tr>\`).join('');
const list = (items) => items.map((i) => \`<li style="margin:4px 0">\${i}</li>\`).join('');

const html = \`<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#141311">
  <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a867c;margin:0">\${r.business} · \${r.period.from} → \${r.period.to}</p>
  <h1 style="font-size:22px;line-height:1.25;margin:8px 0 12px">\${s.headline}</h1>
  <p style="font-size:15px;line-height:1.55;color:#33312c">\${s.summary}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2ddd0;border-bottom:1px solid #e2ddd0;margin:16px 0;font-size:14px">\${rows}</table>
  <h3 style="font-size:14px;margin:18px 0 4px">Wins</h3><ul style="padding-left:18px;font-size:14px">\${list(s.wins)}</ul>
  <h3 style="font-size:14px;margin:18px 0 4px">Watch</h3><ul style="padding-left:18px;font-size:14px">\${list(s.risks)}</ul>
  <h3 style="font-size:14px;margin:18px 0 4px">Do this week</h3><ol style="padding-left:18px;font-size:14px">\${list(s.actions)}</ol>
</div>\`;

return [{ json: { ...r, summary: s, html } }];`;

export function build() {
  const wf = new Workflow("Weekly KPI Report — numbers + AI executive summary", {
    description: "Every Monday at 8am: pulls the last 14 days of orders from Postgres, computes week-over-week KPIs, has " + AI.name + " write a plain-English executive summary with wins, risks and actions, and emails a clean HTML report and a Slack digest.",
    tags: ["AI", "Reporting", "Analytics"],
  });

  wf.note(
    [
      "## Weekly KPI Report",
      "**Monday 08:00** → Postgres → KPIs (revenue, orders, AOV, new customers, conversion, refund rate — week over week) → " + AI.name + " writes the story → HTML email + Slack.",
      "",
      "The KPI maths is done in code, not by the model — **" + AI.name + " only explains numbers it is given**.",
      "",
      "Webhook `POST /kpi-report` returns the full report as JSON + HTML; with no body it uses realistic sample data.",
    ].join("\n"),
    [-480, -60],
    { width: 440, height: 330, color: 4 },
  );

  wf.add("Every Monday 8am", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 100], {
    rule: { interval: [{ field: "weeks", weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 8, triggerAtMinute: 0 }] },
  });
  wf.add("Last 14 days of orders", "n8n-nodes-base.postgres", 2.5, [220, 100], {
    operation: "executeQuery",
    query: [
      "select date_trunc('day', o.created_at)::date as day,",
      "       sum(o.total)                          as revenue,",
      "       count(*)                              as orders,",
      "       count(*) filter (where o.is_first_order) as new_customers,",
      "       coalesce(sum(o.refunded_amount), 0)   as refunds,",
      "       max(t.visitors)                       as visitors",
      "from orders o",
      "left join daily_traffic t on t.day = date_trunc('day', o.created_at)::date",
      "where o.created_at >= current_date - interval '14 days' and o.created_at < current_date",
      "group by 1",
      "order by 1;",
    ].join("\n"),
    options: {},
  });
  code(wf, "Rows → days", [440, 100], rowsToDaysJs);

  webhook(wf, "Report webhook", "kpi-report", [0, 340]);
  code(wf, "Posted or sample data", [440, 340], demoDataJs, { perItem: false });

  code(wf, "Compute KPIs", [680, 220], kpisJs);
  aiStep(wf, "Write executive summary", [920, 220], {
    model: MODELS.smart,
    temperature: 0.4,
    parserName: "Summary schema",
    system: [
      "You are a sharp, plain-spoken COO writing the Monday update for a small business owner.",
      "Use only the numbers provided — never invent figures. Quote the most important changes with their percentages.",
      "Headline: under 12 words, states the single most important change.",
      "Summary: 2–3 sentences. Wins and risks: 2–3 bullets each. Actions: 3 specific, doable-this-week steps.",
    ].join("\n"),
    prompt: "=Business: {{ $json.business }}\nPeriod: {{ $json.period.from }} to {{ $json.period.to }} vs the previous 7 days\n\nKPIs:\n{{ JSON.stringify($json.kpis, null, 2) }}\n\nBest day: {{ JSON.stringify($json.bestDay) }}\nWorst day: {{ JSON.stringify($json.worstDay) }}",
    schema: schema({
      headline: { type: "string" },
      summary: { type: "string" },
      wins: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      actions: { type: "array", items: { type: "string" } },
    }),
  });
  code(wf, "Render HTML report", [1220, 220], renderHtmlJs);
  respond(wf, "Return report", [1460, 80]);
  ifNode(wf, "Live run?", [1460, 360], condition("={{ $json.demo }}", op.isFalse));
  wf.add("Email the report", "n8n-nodes-base.emailSend", 2.1, [1700, 300], {
    fromEmail: "Reports <reports@example.com>",
    toEmail: "owner@example.com",
    subject: "=Weekly report: {{ $json.summary.headline }}",
    emailFormat: "html",
    html: "={{ $json.html }}",
    options: {},
  });
  slackMessage(
    wf,
    "Post digest to Slack",
    [1940, 300],
    "#leadership",
    "=*{{ $('Render HTML report').item.json.summary.headline }}*\n{{ $('Render HTML report').item.json.summary.summary }}\n\n{{ $('Render HTML report').item.json.kpis.map(k => '• ' + k.label + ': ' + (k.changePct === null ? 'n/a' : (k.changePct >= 0 ? '+' : '') + k.changePct + '%')).join('\\n') }}",
  );

  wf.link("Every Monday 8am", "Last 14 days of orders");
  wf.link("Last 14 days of orders", "Rows → days");
  wf.link("Rows → days", "Compute KPIs");
  wf.link("Report webhook", "Posted or sample data");
  wf.link("Posted or sample data", "Compute KPIs");
  wf.link("Compute KPIs", "Write executive summary");
  wf.link("Write executive summary", "Render HTML report");
  wf.link("Render HTML report", "Return report");
  wf.link("Render HTML report", "Live run?");
  wf.link("Live run?", "Email the report", 0);
  wf.link("Email the report", "Post digest to Slack");
  return wf;
}
