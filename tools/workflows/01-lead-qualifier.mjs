import { AI, aiStep, condition, ifNode, op, respond, schema, set, sheetsAppend, slackMessage, webhook, Workflow } from "../lib.mjs";

export const meta = {
  slug: "lead-qualifier",
  file: "01-ai-lead-qualifier.json",
};

export function build() {
  const wf = new Workflow("AI Lead Qualifier — score, route & draft a reply", {
    description: "Scores inbound leads 0–100 against your ideal customer profile with " + AI.name + ", logs them to a Google Sheets CRM, alerts sales on Slack for hot leads and drafts a personalised reply.",
    tags: ["AI", "Sales", "Lead generation"],
  });

  wf.note(
    [
      "## AI Lead Qualifier",
      "Scores every inbound lead against your **ideal customer profile**, then routes it.",
      "",
      "**Flow**",
      "1. Website form / CRM posts the lead to the webhook",
      "2. " + AI.name + " returns a score, tier, reasons and a reply draft (structured JSON)",
      "3. The webhook responds instantly with the result",
      "4. Live runs are logged to Google Sheets; hot leads (70+) ping `#sales` on Slack",
      "",
      "**Setup:** add " + AI.credentialHint + ", a Google Sheets credential + sheet, and a Slack credential. Edit the ICP in the system prompt.",
      "",
      "Send `\"demo\": true` in the body to skip the Sheets/Slack side effects.",
    ].join("\n"),
    [-420, 40],
    { width: 380, height: 460, color: 4 },
  );

  webhook(wf, "Lead form webhook", "lead-qualifier", [0, 260]);
  set(wf, "Normalize lead", [220, 260], [
    ["name", "={{ ($json.body.name || '').trim() }}"],
    ["email", "={{ ($json.body.email || '').trim().toLowerCase() }}"],
    ["company", "={{ $json.body.company || '' }}"],
    ["website", "={{ $json.body.website || '' }}"],
    ["role", "={{ $json.body.role || '' }}"],
    ["budget", "={{ $json.body.budget || 'Not specified' }}"],
    ["timeline", "={{ $json.body.timeline || 'Not specified' }}"],
    ["message", "={{ String($json.body.message || '').slice(0, 4000) }}"],
    ["source", "={{ $json.body.source || 'website' }}"],
    ["demo", "={{ $json.body.demo === true }}", "boolean"],
    ["receivedAt", "={{ $now.toISO() }}"],
  ]);

  aiStep(wf, "Qualify lead", [460, 260], {
    parserName: "Lead score schema",
    system: [
      "You are a senior sales development rep for a software studio that builds web apps, mobile apps, CRMs, booking systems and AI automations for small and mid-sized businesses in North America.",
      "",
      "Ideal customer profile:",
      "- A business with a clear problem that software or automation can solve",
      "- Budget of CA$5,000+ for a project, or a monthly retainer",
      "- Decision maker or strong influencer (founder, owner, director, head of operations)",
      "- Wants to start within the next 3 months",
      "",
      "Score the lead 0–100 against this profile. Be calibrated — most leads are warm, few are hot.",
      "- hot (70–100): strong fit, clear need, budget and authority",
      "- warm (40–69): some fit, but budget, authority or timeline is unclear",
      "- cold (0–39): poor fit, spam, students, job seekers, vague requests",
      "",
      "Write the reply draft in the lead's language: friendly, specific to their message, under 120 words, ending with one clear next step. Never invent facts about the lead.",
    ].join("\n"),
    prompt: [
      "=Qualify this inbound lead.",
      "",
      "Name: {{ $json.name }}",
      "Email: {{ $json.email }}",
      "Company: {{ $json.company }}",
      "Website: {{ $json.website }}",
      "Role: {{ $json.role }}",
      "Budget: {{ $json.budget }}",
      "Timeline: {{ $json.timeline }}",
      "Source: {{ $json.source }}",
      'Message:\n"""\n{{ $json.message }}\n"""',
    ].join("\n"),
    schema: schema(
      {
        score: { type: "integer", minimum: 0, maximum: 100 },
        tier: { type: "string", enum: ["hot", "warm", "cold"] },
        intent: { type: "string", description: "One sentence: what the lead wants" },
        servicesNeeded: { type: "array", items: { type: "string" } },
        budgetFit: { type: "string", enum: ["strong", "possible", "weak", "unknown"] },
        isDecisionMaker: { type: "boolean" },
        reasons: { type: "array", items: { type: "string" }, description: "2–4 short reasons for the score" },
        nextAction: { type: "string" },
        replyDraft: { type: "string" },
      },
      ["score", "tier", "intent", "servicesNeeded", "budgetFit", "isDecisionMaker", "reasons", "nextAction", "replyDraft"],
    ),
  });

  set(wf, "Lead + qualification", [760, 260], [
    ["lead", "={{ $('Normalize lead').item.json }}", "object"],
    ["qualification", "={{ $json.output }}", "object"],
  ]);

  respond(wf, "Return qualification", [1000, 120], "={{ { ok: true, lead: { name: $json.lead.name, company: $json.lead.company }, ...$json.qualification } }}");
  ifNode(wf, "Live run?", [1000, 400], condition("={{ $json.lead.demo }}", op.isFalse));
  sheetsAppend(wf, "Log to CRM sheet", [1240, 380], "Leads", [
    ["Received", "={{ $json.lead.receivedAt }}"],
    ["Name", "={{ $json.lead.name }}"],
    ["Email", "={{ $json.lead.email }}"],
    ["Company", "={{ $json.lead.company }}"],
    ["Score", "={{ $json.qualification.score }}"],
    ["Tier", "={{ $json.qualification.tier }}"],
    ["Intent", "={{ $json.qualification.intent }}"],
    ["Next action", "={{ $json.qualification.nextAction }}"],
    ["Source", "={{ $json.lead.source }}"],
  ]);
  ifNode(wf, "Hot lead?", [1480, 380], condition("={{ $('Lead + qualification').item.json.qualification.score }}", op.gte, 70));
  slackMessage(
    wf,
    "Alert #sales",
    [1720, 300],
    "#sales",
    [
      "=:fire: *Hot lead* — {{ $('Lead + qualification').item.json.lead.name }} ({{ $('Lead + qualification').item.json.lead.company || 'no company' }}) scored *{{ $('Lead + qualification').item.json.qualification.score }}*",
      "> {{ $('Lead + qualification').item.json.qualification.intent }}",
      "*Next step:* {{ $('Lead + qualification').item.json.qualification.nextAction }}",
      "*Email:* {{ $('Lead + qualification').item.json.lead.email }}",
    ].join("\n"),
  );

  wf.link("Lead form webhook", "Normalize lead");
  wf.link("Normalize lead", "Qualify lead");
  wf.link("Qualify lead", "Lead + qualification");
  wf.link("Lead + qualification", "Return qualification");
  wf.link("Lead + qualification", "Live run?");
  wf.link("Live run?", "Log to CRM sheet", 0);
  wf.link("Log to CRM sheet", "Hot lead?");
  wf.link("Hot lead?", "Alert #sales", 0);
  return wf;
}
