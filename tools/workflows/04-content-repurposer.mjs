import { aiStep, condition, ifNode, MODELS, op, respond, schema, set, sheetsAppend, webhook, Workflow } from "../lib.mjs";

export const meta = {
  slug: "content-repurposer",
  file: "04-content-repurposing-engine.json",
};

export function build() {
  const wf = new Workflow("Content Repurposing Engine — one article, every channel", {
    description: "Give it a blog URL or raw text and get back a LinkedIn post, an X thread, a newsletter blurb, an Instagram caption, hooks and hashtags in your brand voice — optionally queued in a Google Sheets content calendar.",
    tags: ["AI", "Marketing", "Content"],
  });

  wf.note(
    [
      "## Content Repurposing Engine",
      "`POST { url | text, tone?, audience?, brand? }`",
      "",
      "1. If a URL is given, fetch the page and strip navigation, scripts and footers",
      "2. **" + MODELS.smart.name + "** rewrites it for LinkedIn, X, email and Instagram",
      "3. The webhook returns all formats as JSON",
      "4. Live runs are appended to a **content calendar** sheet for review",
    ].join("\n"),
    [-460, 0],
    { width: 400, height: 320, color: 4 },
  );

  webhook(wf, "Content webhook", "content-repurposer", [0, 240]);
  set(wf, "Input", [220, 240], [
    ["url", "={{ String($json.body.url || '').trim() }}"],
    ["text", "={{ String($json.body.text || '').slice(0, 20000) }}"],
    ["tone", "={{ $json.body.tone || 'confident, practical, no hype' }}"],
    ["audience", "={{ $json.body.audience || 'small business owners' }}"],
    ["brand", "={{ $json.body.brand || '' }}"],
    ["demo", "={{ $json.body.demo === true }}", "boolean"],
  ]);
  ifNode(wf, "Has URL?", [440, 240], condition("={{ $json.url }}", op.notEmpty));

  wf.add("Fetch article", "n8n-nodes-base.httpRequest", 4.2, [680, 120], {
    url: "={{ $json.url }}",
    options: { response: { response: { responseFormat: "text", outputPropertyName: "html" } }, timeout: 15000 },
  });
  wf.add("Extract readable text", "n8n-nodes-base.html", 1.2, [900, 120], {
    operation: "extractHtmlContent",
    dataPropertyName: "html",
    extractionValues: {
      values: [
        { key: "title", cssSelector: "title", returnValue: "text" },
        { key: "body", cssSelector: "article, main, body", returnValue: "text", skipSelectors: "nav, header, footer, script, style, aside, form, noscript" },
      ],
    },
    options: { trimValues: true, cleanUpText: true },
  });
  set(wf, "From article", [1120, 120], [
    ["title", "={{ $json.title || '' }}"],
    ["content", "={{ String($json.body || '').replace(/\\s+/g, ' ').slice(0, 15000) }}"],
  ]);
  set(wf, "From text", [1120, 360], [
    ["title", ""],
    ["content", "={{ $('Input').item.json.text }}"],
  ]);

  set(wf, "Source content", [1340, 240], [
    ["title", "={{ $json.title }}"],
    ["content", "={{ $json.content }}"],
    ["tone", "={{ $('Input').item.json.tone }}"],
    ["audience", "={{ $('Input').item.json.audience }}"],
    ["brand", "={{ $('Input').item.json.brand }}"],
    ["url", "={{ $('Input').item.json.url }}"],
    ["demo", "={{ $('Input').item.json.demo }}", "boolean"],
  ]);

  aiStep(wf, "Repurpose content", [1580, 240], {
    model: MODELS.smart,
    temperature: 0.7,
    parserName: "Channel formats schema",
    system: [
      "You are a senior content strategist and copywriter. Repurpose the source into native content for each channel.",
      "",
      "Rules:",
      "- Keep every claim faithful to the source. Do not invent statistics, quotes or results.",
      "- LinkedIn: strong first line, short paragraphs, one idea, a soft CTA, 120–220 words, max 3 emojis.",
      "- X thread: 4–7 posts, each under 270 characters, first post is the hook, number them like 1/.",
      "- Newsletter blurb: 60–90 words that make people click.",
      "- Instagram caption: conversational, line breaks, up to 5 relevant hashtags at the end.",
      "- Hooks: 3 alternative opening lines with different angles (contrarian, story, data).",
    ].join("\n"),
    prompt: [
      "=Audience: {{ $json.audience }}",
      "Tone: {{ $json.tone }}",
      "{{ $json.brand ? 'Brand: ' + $json.brand : '' }}",
      "Title: {{ $json.title || 'n/a' }}",
      "",
      'Source:\n"""\n{{ $json.content }}\n"""',
    ].join("\n"),
    schema: schema({
      headline: { type: "string" },
      summary: { type: "string", description: "Two sentences" },
      linkedinPost: { type: "string" },
      xThread: { type: "array", items: { type: "string" } },
      newsletterBlurb: { type: "string" },
      instagramCaption: { type: "string" },
      hooks: { type: "array", items: { type: "string" } },
      hashtags: { type: "array", items: { type: "string" } },
      keyTakeaways: { type: "array", items: { type: "string" } },
    }),
  });

  set(wf, "Content pack", [1880, 240], [
    ["source", "={{ { url: $('Source content').item.json.url, title: $('Source content').item.json.title } }}", "object"],
    ["formats", "={{ $json.output }}", "object"],
    ["demo", "={{ $('Source content').item.json.demo }}", "boolean"],
  ]);
  respond(wf, "Return content pack", [2120, 100], "={{ { ok: true, source: $json.source, ...$json.formats } }}");
  ifNode(wf, "Live run?", [2120, 380], condition("={{ $json.demo }}", op.isFalse));
  sheetsAppend(wf, "Add to content calendar", [2360, 360], "Content calendar", [
    ["Created", "={{ $now.toISODate() }}"],
    ["Headline", "={{ $json.formats.headline }}"],
    ["Source", "={{ $json.source.url || 'pasted text' }}"],
    ["LinkedIn", "={{ $json.formats.linkedinPost }}"],
    ["X thread", "={{ $json.formats.xThread.join('\\n\\n') }}"],
    ["Newsletter", "={{ $json.formats.newsletterBlurb }}"],
    ["Instagram", "={{ $json.formats.instagramCaption }}"],
    ["Status", "Draft"],
  ]);

  wf.link("Content webhook", "Input");
  wf.link("Input", "Has URL?");
  wf.link("Has URL?", "Fetch article", 0);
  wf.link("Has URL?", "From text", 1);
  wf.link("Fetch article", "Extract readable text");
  wf.link("Extract readable text", "From article");
  wf.link("From article", "Source content");
  wf.link("From text", "Source content");
  wf.link("Source content", "Repurpose content");
  wf.link("Repurpose content", "Content pack");
  wf.link("Content pack", "Return content pack");
  wf.link("Content pack", "Live run?");
  wf.link("Live run?", "Add to content calendar", 0);
  return wf;
}
