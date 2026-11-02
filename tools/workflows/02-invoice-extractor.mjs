import { AI, aiModel, code, condition, ifNode, MODELS, op, respond, set, sheetsAppend, slackMessage, webhook, Workflow } from "../lib.mjs";

export const meta = {
  slug: "invoice-extractor",
  file: "02-invoice-receipt-extractor.json",
};

const invoiceSchema = {
  type: "object",
  properties: {
    documentType: { type: "string", enum: ["invoice", "receipt", "credit_note", "other"] },
    vendorName: { type: ["string", "null"] },
    vendorTaxNumber: { type: ["string", "null"], description: "GST/HST business number, QST number or VAT ID if printed" },
    invoiceNumber: { type: ["string", "null"] },
    invoiceDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
    dueDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
    currency: { type: "string", description: "ISO 4217 code, e.g. CAD or USD" },
    subtotal: { type: ["number", "null"] },
    taxes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["GST", "HST", "PST", "QST", "VAT", "Sales tax", "Other"] },
          rate: { type: ["number", "null"], description: "Percent, e.g. 13 for 13%" },
          amount: { type: "number" },
        },
        required: ["type", "amount"],
      },
    },
    total: { type: ["number", "null"] },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: ["number", "null"] },
          unitPrice: { type: ["number", "null"] },
          amount: { type: "number" },
        },
        required: ["description", "amount"],
      },
    },
    category: { type: "string", enum: ["software", "hardware", "travel", "meals", "office", "contractor", "marketing", "utilities", "rent", "other"] },
    paymentStatus: { type: "string", enum: ["paid", "due", "overdue", "unknown"] },
  },
  required: ["documentType", "vendorName", "invoiceDate", "currency", "subtotal", "taxes", "total", "lineItems", "category", "paymentStatus"],
};

const validateJs = `// Cross-check the model's numbers so a bad extraction is flagged, never silently booked.
const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inv = $json.output ?? {};
const doc = $('Normalize document').item.json;
const issues = [];

const lineSum = round((inv.lineItems ?? []).reduce((s, l) => s + (Number(l.amount) || 0), 0));
const taxSum = round((inv.taxes ?? []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
const subtotal = round(inv.subtotal ?? lineSum);
const total = round(inv.total);

if (!inv.vendorName) issues.push('Vendor name is missing');
if (!inv.invoiceDate) issues.push('Invoice date is missing');
if (!total) issues.push('Total is missing');
if ((inv.lineItems ?? []).length && Math.abs(lineSum - subtotal) > 0.05)
  issues.push(\`Line items add up to \${lineSum.toFixed(2)} but the subtotal is \${subtotal.toFixed(2)}\`);
if (total && Math.abs(subtotal + taxSum - total) > 0.05)
  issues.push(\`Subtotal + taxes = \${(subtotal + taxSum).toFixed(2)} but the total is \${total.toFixed(2)}\`);

return {
  json: {
    invoice: { ...inv, subtotal, total },
    validation: { status: issues.length ? 'needs_review' : 'ok', issues, lineItemsTotal: lineSum, taxTotal: taxSum },
    meta: { source: doc.source, fileName: doc.fileName, demo: doc.demo, receivedAt: doc.receivedAt },
  },
};`;

export function build() {
  const wf = new Workflow("Invoice & Receipt Extractor — AI bookkeeping with validation", {
    description: "Turns invoices and receipts (email PDFs or pasted text) into structured, validated JSON — vendor, dates, GST/HST/PST/QST, line items and category — then logs them to an expense sheet and flags anything that doesn't add up.",
    tags: ["AI", "Finance", "Document processing"],
  });

  wf.note(
    [
      "## Invoice & Receipt Extractor",
      "Two entry points, one pipeline:",
      "- **Gmail**: new emails with a PDF invoice attached",
      "- **Webhook**: `POST { text }` from any app",
      "",
      AI.name + " extracts vendor, dates, taxes (GST · HST · PST · QST), line items and a spend category. A Code step **re-adds the numbers** — if line items, taxes and total don't reconcile, the document is marked `needs_review` and posted to `#finance`.",
      "",
      "**Setup:** " + AI.vendor + ", Gmail OAuth, Google Sheets and Slack credentials.",
    ].join("\n"),
    [-460, -40],
    { width: 400, height: 420, color: 4 },
  );

  wf.add("New invoice email", "n8n-nodes-base.gmailTrigger", 1.2, [0, 120], {
    pollTimes: { item: [{ mode: "everyX", value: 5, unit: "minutes" }] },
    simple: false,
    filters: { q: "has:attachment filename:pdf (invoice OR receipt OR bill)", readStatus: "unread" },
    options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: "attachment_" },
  });
  wf.add("Read PDF text", "n8n-nodes-base.extractFromFile", 1.1, [220, 120], { operation: "pdf", binaryPropertyName: "attachment_0", options: {} });
  set(wf, "Email document", [440, 120], [
    ["text", "={{ String($json.text || '').slice(0, 20000) }}"],
    ["fileName", "={{ $('New invoice email').item.binary?.attachment_0?.fileName || 'attachment.pdf' }}"],
    ["source", "gmail"],
    ["demo", "={{ false }}", "boolean"],
  ]);

  webhook(wf, "Document webhook", "invoice-extractor", [0, 360]);
  set(wf, "Webhook document", [440, 360], [
    ["text", "={{ String($json.body.text || '').slice(0, 20000) }}"],
    ["fileName", "={{ $json.body.fileName || 'pasted-text' }}"],
    ["source", "webhook"],
    ["demo", "={{ $json.body.demo === true }}", "boolean"],
  ]);

  set(wf, "Normalize document", [680, 240], [["receivedAt", "={{ $now.toISO() }}"]], { keepOthers: true });

  wf.add("Extract invoice fields", "@n8n/n8n-nodes-langchain.informationExtractor", 1.2, [920, 240], {
    text: "=Extract the details of this invoice or receipt.\n\n---\n{{ $json.text }}\n---",
    schemaType: "manual",
    inputSchema: JSON.stringify(invoiceSchema, null, 2),
    options: {
      systemPromptTemplate: [
        "You are an accounts-payable assistant for a Canadian small business.",
        "Extract only what is printed on the document — never guess. Use null for missing values.",
        "Dates must be YYYY-MM-DD. Amounts are plain numbers without currency symbols.",
        "List each sales tax separately (GST, HST, PST, QST) with its rate when shown.",
        "Pick the closest spend category.",
      ].join("\n"),
    },
  });
  aiModel(wf, MODELS.fast.name, [860, 460], MODELS.fast, { temperature: 0 });
  wf.attach(MODELS.fast.name, "Extract invoice fields", "ai_languageModel");

  code(wf, "Validate totals", [1200, 240], validateJs, { perItem: true });
  respond(wf, "Return extraction", [1440, 100]);
  ifNode(wf, "Live run?", [1440, 380], condition("={{ $json.meta.demo }}", op.isFalse));
  sheetsAppend(wf, "Append to expense ledger", [1680, 360], "Expenses", [
    ["Date", "={{ $json.invoice.invoiceDate }}"],
    ["Vendor", "={{ $json.invoice.vendorName }}"],
    ["Invoice #", "={{ $json.invoice.invoiceNumber }}"],
    ["Category", "={{ $json.invoice.category }}"],
    ["Subtotal", "={{ $json.invoice.subtotal }}"],
    ["Tax", "={{ $json.validation.taxTotal }}"],
    ["Total", "={{ $json.invoice.total }}"],
    ["Currency", "={{ $json.invoice.currency }}"],
    ["Status", "={{ $json.validation.status }}"],
    ["File", "={{ $json.meta.fileName }}"],
  ]);
  ifNode(wf, "Needs review?", [1920, 360], condition("={{ $('Validate totals').item.json.validation.status }}", op.equals, "needs_review"));
  slackMessage(
    wf,
    "Flag in #finance",
    [2160, 280],
    "#finance",
    "=:warning: *Invoice needs review* — {{ $('Validate totals').item.json.invoice.vendorName || 'Unknown vendor' }} · {{ $('Validate totals').item.json.invoice.total }} {{ $('Validate totals').item.json.invoice.currency }}\n{{ $('Validate totals').item.json.validation.issues.map(i => '• ' + i).join('\\n') }}",
  );

  wf.link("New invoice email", "Read PDF text");
  wf.link("Read PDF text", "Email document");
  wf.link("Email document", "Normalize document");
  wf.link("Document webhook", "Webhook document");
  wf.link("Webhook document", "Normalize document");
  wf.link("Normalize document", "Extract invoice fields");
  wf.link("Extract invoice fields", "Validate totals");
  wf.link("Validate totals", "Return extraction");
  wf.link("Validate totals", "Live run?");
  wf.link("Live run?", "Append to expense ledger", 0);
  wf.link("Append to expense ledger", "Needs review?");
  wf.link("Needs review?", "Flag in #finance", 0);
  return wf;
}
