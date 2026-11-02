import { AI, aiStep, condition, ifNode, op, respond, schema, set, slackMessage, switchNode, webhook, Workflow } from "../lib.mjs";

export const meta = {
  slug: "support-triage",
  file: "03-support-inbox-triage.json",
};

const categories = ["billing", "bug_report", "account_access", "feature_request", "sales_inquiry", "cancellation", "spam", "other"];

export function build() {
  const wf = new Workflow("Support Inbox Triage — classify, prioritise & draft replies", {
    description: "Reads every new support email, classifies it (billing, bug, access, cancellation, spam…), scores urgency and sentiment, escalates urgent tickets to Slack and leaves a ready-to-send draft reply in the Gmail thread.",
    tags: ["AI", "Customer support", "Email"],
  });

  wf.note(
    [
      "## Support Inbox Triage",
      "Turns a shared inbox into a prioritised queue.",
      "",
      "- " + AI.name + " returns **category · urgency · sentiment · summary · reply draft**",
      "- **Spam** is marked read and skipped",
      "- **High / critical** or angry customers are escalated to `#support` on Slack",
      "- Every real ticket gets a **draft reply in the same Gmail thread** — a human reviews and sends",
      "",
      "Test it without Gmail: `POST /support-triage` with `{ from, subject, body, demo: true }`.",
    ].join("\n"),
    [-460, -40],
    { width: 400, height: 400, color: 4 },
  );

  wf.add("New support email", "n8n-nodes-base.gmailTrigger", 1.2, [0, 120], {
    pollTimes: { item: [{ mode: "everyMinute" }] },
    simple: false,
    filters: { labelIds: ["INBOX"], readStatus: "unread" },
    options: {},
  });
  set(wf, "Email payload", [240, 120], [
    ["from", "={{ $json.from?.value?.[0]?.address || '' }}"],
    ["fromName", "={{ $json.from?.value?.[0]?.name || '' }}"],
    ["subject", "={{ $json.subject || '(no subject)' }}"],
    ["body", "={{ String($json.text || '').slice(0, 6000) }}"],
    ["threadId", "={{ $json.threadId }}"],
    ["messageId", "={{ $json.id }}"],
    ["source", "gmail"],
    ["demo", "={{ false }}", "boolean"],
  ]);

  webhook(wf, "Ticket webhook", "support-triage", [0, 360]);
  set(wf, "Webhook payload", [240, 360], [
    ["from", "={{ $json.body.from || 'customer@example.com' }}"],
    ["fromName", "={{ $json.body.fromName || '' }}"],
    ["subject", "={{ $json.body.subject || '(no subject)' }}"],
    ["body", "={{ String($json.body.body || '').slice(0, 6000) }}"],
    ["threadId", ""],
    ["messageId", ""],
    ["source", "webhook"],
    ["demo", "={{ $json.body.demo === true }}", "boolean"],
  ]);

  set(wf, "Normalize email", [480, 240], [["receivedAt", "={{ $now.toISO() }}"]], { keepOthers: true });

  aiStep(wf, "Triage email", [720, 240], {
    parserName: "Triage schema",
    system: [
      "You are the head of customer support for a B2B SaaS company. Triage each incoming email.",
      "",
      "Urgency rubric:",
      "- critical: outage, data loss, security issue, or payment taken in error",
      "- high: customer blocked from core work, or threatening to cancel",
      "- normal: questions and non-blocking problems",
      "- low: feedback, feature ideas, newsletters",
      "",
      "needsHuman is true for refunds, legal or security topics, angry customers, and anything you are unsure about.",
      "",
      "Reply draft: warm, concise (under 130 words), acknowledge the specific problem, give the next step. Never promise refunds, credits or dates. Sign off as “The Support Team”. Leave suggestedReply empty for spam.",
    ].join("\n"),
    prompt: '=From: {{ $json.fromName }} <{{ $json.from }}>\nSubject: {{ $json.subject }}\n\n"""\n{{ $json.body }}\n"""',
    schema: schema({
      category: { type: "string", enum: categories },
      urgency: { type: "string", enum: ["low", "normal", "high", "critical"] },
      sentiment: { type: "string", enum: ["positive", "neutral", "negative", "angry"] },
      summary: { type: "string", description: "One sentence" },
      customerGoal: { type: "string" },
      language: { type: "string", description: "ISO 639-1 code" },
      needsHuman: { type: "boolean" },
      tags: { type: "array", items: { type: "string" } },
      suggestedReply: { type: "string" },
    }),
  });

  set(wf, "Ticket", [1020, 240], [
    ["email", "={{ $('Normalize email').item.json }}", "object"],
    ["triage", "={{ $json.output }}", "object"],
  ]);
  respond(wf, "Return triage", [1260, 100], "={{ { ok: true, subject: $json.email.subject, ...$json.triage } }}");
  ifNode(wf, "Live run?", [1260, 380], condition("={{ $json.email.demo }}", op.isFalse));

  switchNode(
    wf,
    "Route ticket",
    [1500, 360],
    [
      ["Spam", condition("={{ $json.triage.category }}", op.equals, "spam")],
      [
        "Escalate",
        {
          options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
          conditions: [
            { id: "b7d1e0a2-0c1f-4c55-9d6f-0a1b2c3d4e01", leftValue: "={{ ['high', 'critical'].includes($json.triage.urgency) }}", rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } },
            { id: "b7d1e0a2-0c1f-4c55-9d6f-0a1b2c3d4e02", leftValue: "={{ $json.triage.sentiment === 'angry' }}", rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } },
          ],
          combinator: "or",
        },
      ],
    ],
    "Standard",
  );

  wf.add("Mark spam as read", "n8n-nodes-base.gmail", 2.1, [1760, 200], {
    operation: "markAsRead",
    messageId: "={{ $json.email.messageId }}",
  });
  slackMessage(
    wf,
    "Escalate to #support",
    [1760, 380],
    "#support",
    "=:rotating_light: *{{ $json.triage.urgency.toUpperCase() }}* · {{ $json.triage.category.replace('_', ' ') }} · {{ $json.triage.sentiment }}\n*{{ $json.email.subject }}* — {{ $json.email.fromName || $json.email.from }}\n> {{ $json.triage.summary }}",
  );
  wf.add("Draft reply in thread", "n8n-nodes-base.gmail", 2.1, [2000, 460], {
    resource: "draft",
    subject: "=Re: {{ $('Ticket').item.json.email.subject }}",
    emailType: "text",
    message: "={{ $('Ticket').item.json.triage.suggestedReply }}",
    options: {
      threadId: "={{ $('Ticket').item.json.email.threadId }}",
      sendTo: "={{ $('Ticket').item.json.email.from }}",
    },
  });

  wf.link("New support email", "Email payload");
  wf.link("Email payload", "Normalize email");
  wf.link("Ticket webhook", "Webhook payload");
  wf.link("Webhook payload", "Normalize email");
  wf.link("Normalize email", "Triage email");
  wf.link("Triage email", "Ticket");
  wf.link("Ticket", "Return triage");
  wf.link("Ticket", "Live run?");
  wf.link("Live run?", "Route ticket", 0);
  wf.link("Route ticket", "Mark spam as read", 0);
  wf.link("Route ticket", "Escalate to #support", 1);
  wf.link("Route ticket", "Draft reply in thread", 2);
  wf.link("Escalate to #support", "Draft reply in thread");
  return wf;
}
