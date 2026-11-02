import catalog from "./catalog.json";

export type FieldType = "text" | "email" | "textarea" | "number";

export interface DemoField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  rows?: number;
  maxLength: number;
  required?: boolean;
  half?: boolean;
}

export interface DemoPreset {
  label: string;
  values: Record<string, string>;
}

export interface WorkflowDoc {
  slug: string;
  file: string;
  index: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  category: string;
  integrations: string[];
  model: string;
  steps: string[];
  needs: string[];
  outcomes: string[];
  demo?: {
    fields: DemoField[];
    presets: DemoPreset[];
    submitLabel: string;
  };
}

const docs: WorkflowDoc[] = [
  {
    slug: "lead-qualifier",
    file: "01-ai-lead-qualifier.json",
    index: "01",
    title: "AI Lead Qualifier",
    short: "Lead qualifier",
    tagline: "Score, route and reply to every inbound lead in seconds.",
    description:
      "Scores inbound leads 0–100 against your ideal customer profile, logs them to a Google Sheets CRM, pings sales on Slack for hot leads and drafts a personalised reply.",
    category: "Sales",
    integrations: ["Webhook", "Gemini 3.5 Flash-Lite", "Google Sheets", "Slack"],
    model: "Gemini 3.5 Flash-Lite",
    steps: [
      "Your website form or CRM posts the lead to a webhook.",
      "Gemini scores it against your ICP and returns structured JSON: score, tier, intent, reasons, next action and a reply draft.",
      "The webhook answers instantly, so your form can show a tailored thank-you.",
      "Every lead is logged to a Google Sheets CRM; hot leads (70+) alert #sales on Slack.",
    ],
    needs: ["Gemini API key (free, Google AI Studio)", "Google Sheets", "Slack"],
    outcomes: ["Speed-to-lead in seconds, not hours", "Consistent scoring against one ICP", "A reply draft ready for every lead"],
    demo: {
      submitLabel: "Qualify this lead",
      fields: [
        { name: "name", label: "Name", type: "text", maxLength: 80, required: true, half: true },
        { name: "email", label: "Email", type: "email", maxLength: 120, required: true, half: true },
        { name: "company", label: "Company", type: "text", maxLength: 120, half: true },
        { name: "role", label: "Role", type: "text", maxLength: 80, half: true },
        { name: "budget", label: "Budget", type: "text", maxLength: 60, half: true },
        { name: "timeline", label: "Timeline", type: "text", maxLength: 60, half: true },
        { name: "message", label: "Message", type: "textarea", rows: 4, maxLength: 1500, required: true },
      ],
      presets: [
        {
          label: "Clinic owner",
          values: {
            name: "Sarah Chen",
            email: "sarah@mapledental.ca",
            company: "Maple Dental",
            role: "Owner",
            budget: "CA$15,000",
            timeline: "Next 6 weeks",
            message: "We run 3 dental clinics in Toronto and want online booking with SMS reminders. Our receptionists spend hours on the phone.",
          },
        },
        {
          label: "Vague enquiry",
          values: {
            name: "Jay",
            email: "jay123@gmail.com",
            company: "",
            role: "",
            budget: "",
            timeline: "",
            message: "how much for an app like uber",
          },
        },
        {
          label: "Agency partner",
          values: {
            name: "Lena Ortiz",
            email: "lena@northpeakmarketing.com",
            company: "Northpeak Marketing",
            role: "Director of Operations",
            budget: "Monthly retainer",
            timeline: "This quarter",
            message: "We manage 40 client ad accounts and want to automate weekly reporting and lead routing into HubSpot.",
          },
        },
      ],
    },
  },
  {
    slug: "invoice-extractor",
    file: "02-invoice-receipt-extractor.json",
    index: "02",
    title: "Invoice & Receipt Extractor",
    short: "Invoice extractor",
    tagline: "Turn PDFs and receipts into clean, validated bookkeeping rows.",
    description:
      "Extracts vendor, dates, GST/HST/PST/QST, line items and a spend category from invoices — then re-adds the numbers in code and flags anything that doesn't reconcile.",
    category: "Finance",
    integrations: ["Gmail", "PDF", "Gemini 3.5 Flash-Lite", "Google Sheets", "Slack"],
    model: "Gemini 3.5 Flash-Lite",
    steps: [
      "New Gmail messages with a PDF invoice are picked up automatically — or any app can POST raw text.",
      "The PDF is converted to text and Gemini extracts every field into a strict JSON schema.",
      "A Code step re-adds line items and taxes. If the totals don't match, the invoice is marked needs_review.",
      "Clean invoices land in an expense ledger sheet; problems are posted to #finance.",
    ],
    needs: ["Gemini API key (free, Google AI Studio)", "Gmail", "Google Sheets", "Slack"],
    outcomes: ["No more manual data entry", "Canadian sales taxes split correctly", "Maths checked by code, not trusted to AI"],
    demo: {
      submitLabel: "Extract invoice",
      fields: [{ name: "text", label: "Invoice or receipt text", type: "textarea", rows: 9, maxLength: 6000, required: true }],
      presets: [
        {
          label: "Office supplies (HST)",
          values: {
            text: "NORTHWIND OFFICE SUPPLY LTD.\nGST/HST 123456789 RT0001\nInvoice INV-20417        Date: 2026-09-14        Due: 2026-10-14\n\n2 x Ergonomic office chair   @ 180.00   360.00\n2 x Desk lamp               @  30.00    60.00\n\nSubtotal                               420.00\nHST 13%                                 54.60\nTOTAL (CAD)                            474.60",
          },
        },
        {
          label: "Café receipt (GST + QST)",
          values: {
            text: "CAFÉ OLIMPICO — Montréal\nTPS/GST 845123456 RT0001  TVQ/QST 1219876543 TQ0001\n2026-09-20 08:41\n\n2 Latte              11.50\n1 Croissant           4.25\n\nSous-total           15.75\nTPS 5%                0.79\nTVQ 9.975%            1.57\nTOTAL                18.11\nVISA ****4412   APPROVED",
          },
        },
      ],
    },
  },
  {
    slug: "support-triage",
    file: "03-support-inbox-triage.json",
    index: "03",
    title: "Support Inbox Triage",
    short: "Support triage",
    tagline: "Every ticket classified, prioritised and answered in draft.",
    description:
      "Classifies each support email, scores urgency and sentiment, escalates urgent or angry customers to Slack and leaves a ready-to-send draft reply in the Gmail thread.",
    category: "Customer support",
    integrations: ["Gmail", "Gemini 3.5 Flash-Lite", "Slack"],
    model: "Gemini 3.5 Flash-Lite",
    steps: [
      "Unread emails in the support inbox are picked up every minute.",
      "Gemini returns category, urgency, sentiment, a one-line summary and a suggested reply.",
      "Spam is archived. High-urgency or angry customers are escalated to #support.",
      "Every real ticket gets a draft reply in the same Gmail thread — a human reviews and sends.",
    ],
    needs: ["Gemini API key (free, Google AI Studio)", "Gmail", "Slack"],
    outcomes: ["Urgent issues surface in minutes", "First replies drafted automatically", "Humans stay in control of what's sent"],
    demo: {
      submitLabel: "Triage email",
      fields: [
        { name: "fromName", label: "From", type: "text", maxLength: 80, half: true },
        { name: "from", label: "Email", type: "email", maxLength: 120, half: true },
        { name: "subject", label: "Subject", type: "text", maxLength: 160, required: true },
        { name: "body", label: "Message", type: "textarea", rows: 6, maxLength: 3000, required: true },
      ],
      presets: [
        {
          label: "Double charge",
          values: {
            fromName: "Marc Tremblay",
            from: "marc@example.com",
            subject: "Charged twice this month??",
            body: "Hi, I just noticed my card was charged twice for the September subscription. This is the second time this happens. Please refund the duplicate charge ASAP.",
          },
        },
        {
          label: "Locked out",
          values: {
            fromName: "Aisha Rahman",
            from: "aisha@brightpath.io",
            subject: "Can't log in — whole team blocked",
            body: "Since this morning none of our 12 users can log in, we get 'SSO error 403'. We have a client demo in two hours. Please help urgently.",
          },
        },
        {
          label: "Feature idea",
          values: {
            fromName: "Tom",
            from: "tom@studio.ca",
            subject: "Idea: dark mode",
            body: "Love the product! Any plans for a dark mode? Would be great for late nights.",
          },
        },
      ],
    },
  },
  {
    slug: "content-repurposer",
    file: "04-content-repurposing-engine.json",
    index: "04",
    title: "Content Repurposing Engine",
    short: "Content repurposer",
    tagline: "One article in, a week of channel-native posts out.",
    description:
      "Give it a blog URL or text and get a LinkedIn post, an X thread, a newsletter blurb, an Instagram caption, alternative hooks and hashtags — queued in a content calendar.",
    category: "Marketing",
    integrations: ["HTTP", "HTML", "Gemini 3.6 Flash", "Google Sheets"],
    model: "Gemini 3.6 Flash",
    steps: [
      "Send a URL or paste text. URLs are fetched and stripped of navigation, scripts and footers.",
      "Gemini 3.6 Flash rewrites the piece natively for LinkedIn, X, email and Instagram — faithful to the source, no invented stats.",
      "All formats come back as JSON in one response.",
      "Live runs are appended to a content calendar sheet with status Draft.",
    ],
    needs: ["Gemini API key (free, Google AI Studio)", "Google Sheets"],
    outcomes: ["A week of posts from one article", "On-brand tone and audience", "Drafts queued for review, never auto-posted"],
    demo: {
      submitLabel: "Repurpose",
      fields: [
        { name: "url", label: "Article URL (optional)", type: "text", placeholder: "https://…", maxLength: 300 },
        { name: "text", label: "…or paste text", type: "textarea", rows: 6, maxLength: 6000 },
        { name: "audience", label: "Audience", type: "text", maxLength: 80, half: true },
        { name: "tone", label: "Tone", type: "text", maxLength: 80, half: true },
      ],
      presets: [
        {
          label: "Automation article",
          values: {
            url: "",
            text: "Small businesses lose about six hours a week to copy-paste work between apps: typing leads into a CRM, keying invoices into accounting software, and chasing customers who forget appointments. The fix isn't another tool — it's connecting the ones you already have. Start with the task you repeat most, keep a human approving anything customer-facing, and measure the hours you win back.",
            audience: "small business owners",
            tone: "practical, no hype",
          },
        },
      ],
    },
  },
  {
    slug: "no-show-recovery",
    file: "05-appointment-reminders-no-show-recovery.json",
    index: "05",
    title: "Appointment Reminders & No-show Recovery",
    short: "Booking reminders",
    tagline: "Fewer empty chairs: reminders that send themselves, and rebookings that write themselves.",
    description:
      "For clinics, salons and service businesses: 24-hour and 2-hour SMS/email reminders from your booking system every 15 minutes, plus a warm AI-written rebooking message after a no-show.",
    category: "Booking",
    integrations: ["Schedule", "Booking API", "Twilio SMS", "SMTP", "Gemini 3.5 Flash-Lite"],
    model: "Gemini 3.5 Flash-Lite",
    steps: [
      "Every 15 minutes, confirmed appointments for the next 25 hours are pulled from your booking API.",
      "Code picks the ones due a 24h or 2h reminder and chooses SMS or email.",
      "Reminders go out through Twilio or SMTP and are marked sent, so nobody is messaged twice.",
      "When an appointment is marked no-show, Gemini writes a friendly rebooking SMS and email.",
    ],
    needs: ["Gemini API key (free, Google AI Studio)", "Twilio", "SMTP", "A booking system API"],
    outcomes: ["Fewer no-shows", "Missed visits turned into rebookings", "Works with any booking system with an API"],
    demo: {
      submitLabel: "Write rebooking message",
      fields: [
        { name: "customerName", label: "Customer", type: "text", maxLength: 80, required: true, half: true },
        { name: "service", label: "Service", type: "text", maxLength: 80, required: true, half: true },
        { name: "businessName", label: "Business", type: "text", maxLength: 80, half: true },
        { name: "previousVisits", label: "Previous visits", type: "number", maxLength: 3, half: true },
      ],
      presets: [
        { label: "Loyal patient", values: { customerName: "Priya Shah", service: "teeth cleaning", businessName: "Maple Dental", previousVisits: "6" } },
        { label: "First-time client", values: { customerName: "Daniel Okafor", service: "haircut & beard trim", businessName: "Northside Barbers", previousVisits: "0" } },
      ],
    },
  },
  {
    slug: "kpi-report",
    file: "06-weekly-kpi-report.json",
    index: "06",
    title: "Weekly KPI Report",
    short: "KPI report",
    tagline: "Monday morning numbers, explained in plain English.",
    description:
      "Pulls 14 days of orders from Postgres, computes week-over-week KPIs in code, has Gemini write an executive summary with wins, risks and actions, and emails a clean HTML report.",
    category: "Reporting",
    integrations: ["Schedule", "Postgres", "Gemini 3.6 Flash", "SMTP", "Slack"],
    model: "Gemini 3.6 Flash",
    steps: [
      "Every Monday at 8am the last 14 days of orders are pulled from Postgres.",
      "Code computes revenue, orders, AOV, new customers, conversion and refund rate — week over week.",
      "Gemini explains only the numbers it is given: headline, summary, wins, risks and three actions.",
      "A responsive HTML report is emailed and a digest is posted to Slack.",
    ],
    needs: ["Gemini API key (free, Google AI Studio)", "Postgres", "SMTP", "Slack"],
    outcomes: ["The weekly report writes itself", "Numbers computed in code, never hallucinated", "Clear actions, not just charts"],
    demo: {
      submitLabel: "Generate report",
      fields: [{ name: "business", label: "Business name", type: "text", maxLength: 80, required: true }],
      presets: [
        { label: "Coffee roaster", values: { business: "Northside Coffee Co." } },
        { label: "Online bike shop", values: { business: "Ridgeline Cycles" } },
      ],
    },
  },
  {
    slug: "error-alerts",
    file: "07-global-error-alerts.json",
    index: "07",
    title: "Global Error Alerts",
    short: "Error alerts",
    tagline: "Know the minute an automation breaks — with a link to the failed run.",
    description:
      "An error workflow for every production workflow: failures are posted to Slack and emailed with the workflow, failing node, error message and a direct link to the execution.",
    category: "Operations",
    integrations: ["Error Trigger", "Slack", "SMTP"],
    model: "—",
    steps: [
      "Set it as the error workflow in each production workflow's settings.",
      "When any run fails, the error trigger captures the workflow, node, message and execution URL.",
      "An alert is posted to #alerts and emailed to on-call.",
    ],
    needs: ["Slack", "SMTP"],
    outcomes: ["No silent failures", "One-click jump to the failed execution", "Works across every workflow"],
  },
];

/** Node counts come from the generated catalog so the site never drifts from the templates. */
export const workflows = docs.map((w) => ({
  ...w,
  nodes: catalog.find((c) => c.file === w.file)?.nodeCount ?? 0,
}));

export type Workflow = (typeof workflows)[number];

export const bySlug = (slug: string) => workflows.find((w) => w.slug === slug);
