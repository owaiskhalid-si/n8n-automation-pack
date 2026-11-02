// Minimal stand-in for the LLM APIs the workflows call, so they can be tested
// end-to-end in CI without a real key. It recognises each workflow by its system
// prompt and returns schema-valid JSON in whatever shape the n8n node expects.
//
//   Gemini     GET  /v1beta/models
//              POST /v1beta/models/{model}:generateContent
//              POST /v1beta/models/{model}:streamGenerateContent?alt=sse
//   Anthropic  GET  /v1/models · POST /v1/messages
//
// Point the chat-model credential's host / base URL at this server (see e2e/run.mjs).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 5699);

const fixtures = [
  {
    match: /sales development rep/i,
    output: {
      score: 82,
      tier: "hot",
      intent: "Wants an online booking system with automated reminders for a 3-location dental clinic.",
      servicesNeeded: ["Booking system", "SMS reminders", "CRM integration"],
      budgetFit: "strong",
      isDecisionMaker: true,
      reasons: ["Owner of a multi-location clinic", "Budget of CA$15k stated", "Wants to launch within 6 weeks"],
      nextAction: "Book a 20-minute discovery call this week.",
      replyDraft: "Hi Sarah — thanks for reaching out! A booking system with SMS reminders across three locations is exactly what we build. Could we do a 20-minute call Thursday or Friday to walk through your current process?",
    },
  },
  {
    match: /accounts-payable|extraction algorithm/i,
    output: {
      documentType: "invoice",
      vendorName: "Northwind Office Supply Ltd.",
      vendorTaxNumber: "123456789 RT0001",
      invoiceNumber: "INV-20417",
      invoiceDate: "2026-09-14",
      dueDate: "2026-10-14",
      currency: "CAD",
      subtotal: 420,
      taxes: [{ type: "HST", rate: 13, amount: 54.6 }],
      total: 474.6,
      lineItems: [
        { description: "Ergonomic office chair", quantity: 2, unitPrice: 180, amount: 360 },
        { description: "Desk lamp", quantity: 2, unitPrice: 30, amount: 60 },
      ],
      category: "office",
      paymentStatus: "due",
    },
  },
  {
    match: /head of customer support/i,
    output: {
      category: "billing",
      urgency: "high",
      sentiment: "negative",
      summary: "Customer was charged twice for the September subscription.",
      customerGoal: "Get the duplicate charge refunded.",
      language: "en",
      needsHuman: true,
      tags: ["double-charge", "refund-request"],
      suggestedReply: "Hi Marc, I'm sorry about the duplicate charge — that's frustrating. I've flagged it to our billing team, who will confirm the details within one business day. The Support Team",
    },
  },
  {
    match: /content strategist/i,
    output: {
      headline: "Automate the boring half of your week",
      summary: "Most small businesses lose hours to copy-paste work. Three simple automations win most of it back.",
      linkedinPost: "Your team doesn't need more tools. It needs fewer tabs.\n\nWe audited 20 small businesses: the average owner spends 6 hours a week moving data between apps.\n\nStart with three automations: leads to CRM, invoices to your ledger, reminders to customers.\n\nWhich one would save you the most time?",
      xThread: ["1/ Small businesses lose ~6 hours a week to copy-paste work.", "2/ Automate leads → CRM first.", "3/ Then invoices → ledger.", "4/ Then appointment reminders."],
      newsletterBlurb: "Three automations that give a small team back most of a working day each week.",
      instagramCaption: "Less copy-paste. More actual work.\n\nThree automations every small business should set up first 👇\n\n#automation #smallbusiness",
      hooks: ["You don't need another app.", "We timed it: 6 hours a week.", "The best hire we made was a workflow."],
      hashtags: ["#automation", "#smallbusiness", "#n8n"],
      keyTakeaways: ["Start with the most repetitive task", "Keep a human in the loop", "Measure hours saved"],
    },
  },
  {
    match: /misses an appointment|missed an appointment|local service business/i,
    output: {
      sms: "Hi Priya, we missed you at your cleaning today — no worries, life happens! Grab a new time here: https://book.example.com/maple 😊",
      emailSubject: "Let's find you a new time",
      emailBody: "Hi Priya,\n\nWe missed you at your cleaning today — no stress, it happens to everyone.\n\nYou can pick a new time that suits you in a few seconds here: https://book.example.com/maple\n\nSee you soon,\nMaple Dental",
    },
  },
  {
    match: /COO/,
    output: {
      headline: "Revenue up 4% as new customers grew 8%",
      summary: "A steady week: revenue rose 4.1% on slightly more orders, driven by new customers. Refunds spiked on one day and are worth a look.",
      wins: ["New customers up 7.9% week over week", "Average order value up 1.4%"],
      risks: ["Refund rate jumped 60% on a single bad day", "Conversion rate slipped 3.9%"],
      actions: ["Review the refund spike and its root cause", "Test a checkout tweak to recover conversion", "Welcome-email the new customers with a second-order offer"],
    },
  },
];

/** Pick the fixture whose system prompt appears in the request, shaped for the parser that asked. */
function pickFixture(text) {
  const output = fixtures.find((f) => f.match.test(text))?.output ?? { ok: true };
  // n8n's Structured Output Parser (Basic LLM Chain) asks the model to wrap the result in
  // { "output": … }; the Information Extractor's parser asks for the bare object.
  const wantsWrapper = /\\*"output\\*"\s*:\s*\{/.test(text);
  return wantsWrapper ? { output } : output;
}

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const fenced = (output) => "```json\n" + JSON.stringify(output, null, 2) + "\n```";
const keys = (output) => Object.keys(output.output ?? output).slice(0, 3).join(",");

// ─── Gemini (generativelanguage.googleapis.com) ──────────────────────────────

const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3-flash-preview"];

function gemini(req, res, body, url) {
  if (req.method === "GET" && url.pathname === "/v1beta/models") {
    return json(res, 200, {
      models: GEMINI_MODELS.map((id) => ({ name: `models/${id}`, displayName: id, description: "mock model", supportedGenerationMethods: ["generateContent"] })),
    });
  }
  const m = url.pathname.match(/^\/v1beta\/models\/([^:]+):(generateContent|streamGenerateContent)$/);
  if (!m || req.method !== "POST") return false;
  const [, model, method] = m;
  const output = pickFixture(JSON.stringify(body));
  // Function calling only if the caller declared tools (withStructuredOutput); otherwise fenced JSON text.
  const fn = body.tools?.flatMap((t) => t.functionDeclarations ?? [])[0];
  const part = fn ? { functionCall: { name: fn.name, args: output } } : { text: fenced(output) };
  const chunk = {
    candidates: [{ content: { role: "model", parts: [part] }, finishReason: "STOP", index: 0, safetyRatings: [] }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 },
    modelVersion: model,
  };
  console.log(`[mock gemini] ${model} ${method} fn=${!!fn} → ${keys(output)}`);
  if (method === "streamGenerateContent") {
    if (url.searchParams.get("alt") === "sse") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      return res.end();
    }
    return json(res, 200, [chunk]);
  }
  return json(res, 200, chunk);
}

// ─── Anthropic Messages API ──────────────────────────────────────────────────

function anthropic(req, res, body, url) {
  if (req.method === "GET" && url.pathname.startsWith("/v1/models")) {
    return json(res, 200, { data: [{ id: "claude-haiku-4-5-20251001", type: "model" }] });
  }
  if (req.method !== "POST" || !url.pathname.startsWith("/v1/messages")) return false;
  const system = typeof body.system === "string" ? body.system : JSON.stringify(body.system ?? "");
  const output = pickFixture(system + JSON.stringify(body.messages ?? []));
  const tool = body.tools?.[0];
  const content = tool ? [{ type: "tool_use", id: "toolu_mock_1", name: tool.name, input: output }] : [{ type: "text", text: fenced(output) }];
  const message = {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    model: body.model,
    content,
    stop_reason: tool ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 200 },
  };
  console.log(`[mock anthropic] ${body.model} tools=${body.tools?.length ?? 0} stream=${!!body.stream} → ${keys(output)}`);

  if (body.stream) {
    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send("message_start", { type: "message_start", message: { ...message, content: [], stop_reason: null } });
    content.forEach((block, index) => {
      if (block.type === "text") {
        send("content_block_start", { type: "content_block_start", index, content_block: { type: "text", text: "" } });
        send("content_block_delta", { type: "content_block_delta", index, delta: { type: "text_delta", text: block.text } });
      } else {
        send("content_block_start", { type: "content_block_start", index, content_block: { ...block, input: {} } });
        send("content_block_delta", { type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) } });
      }
      send("content_block_stop", { type: "content_block_stop", index });
    });
    send("message_delta", { type: "message_delta", delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: 200 } });
    send("message_stop", { type: "message_stop" });
    return res.end();
  }
  return json(res, 200, message);
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://mock");
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json(res, 400, { error: "invalid JSON body" });
    }
    if (gemini(req, res, body, url) !== false) return;
    if (anthropic(req, res, body, url) !== false) return;
    json(res, 404, { error: `mock: no handler for ${req.method} ${url.pathname}` });
  });
});

server.listen(PORT, () => console.log(`mock LLM API on :${PORT} (Gemini v1beta + Anthropic v1)`));
