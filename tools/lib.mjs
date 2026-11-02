// Small builder API for n8n workflows. Authoring workflows as code keeps them
// reviewable in pull requests and lets CI validate every template.
import { createHash } from "node:crypto";

/** Deterministic UUID so regenerated JSON produces clean diffs. */
export function uuid(seed) {
  const h = createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** n8n-style 16-character workflow id, stable per workflow name. */
export function workflowId(name) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = createHash("sha256").update(`workflow:${name}`).digest();
  return Array.from(bytes.subarray(0, 16), (b) => alphabet[b % alphabet.length]).join("");
}

// ─── AI provider ─────────────────────────────────────────────────────────────
//
// Google Gemini is the default: the AI Studio free tier covers demo traffic and
// the n8n node needs nothing but an API key. Build with AI_PROVIDER=anthropic to
// generate the same templates on Claude instead.
//
// Model IDs are the ones n8n's Gemini node lists (`models/…`); both tiers are on
// the free tier. Use `fast` for extraction/classification and `smart` for writing.

export const PROVIDERS = {
  gemini: {
    id: "gemini",
    name: "Gemini",
    vendor: "Google Gemini",
    credentialHint: "a Google Gemini credential (free API key from Google AI Studio)",
    nodeType: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
    credentialType: "googlePalmApi",
    models: {
      fast: { provider: "gemini", value: "models/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite" },
      smart: { provider: "gemini", value: "models/gemini-3.6-flash", name: "Gemini 3.6 Flash" },
    },
  },
  anthropic: {
    id: "anthropic",
    name: "Claude",
    vendor: "Anthropic",
    credentialHint: "an Anthropic credential",
    nodeType: "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    credentialType: "anthropicApi",
    models: {
      fast: { provider: "anthropic", value: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
      smart: { provider: "anthropic", value: "claude-sonnet-5", name: "Claude Sonnet 5" },
    },
  },
};

const providerId = process.env.AI_PROVIDER ?? "gemini";
if (!PROVIDERS[providerId]) throw new Error(`Unknown AI_PROVIDER "${providerId}" — use ${Object.keys(PROVIDERS).join(" or ")}`);

/** The active provider (its names are used in sticky notes and descriptions). */
export const AI = PROVIDERS[providerId];
export const MODELS = AI.models;

export class Workflow {
  constructor(name, { description = "", tags = [] } = {}) {
    this.name = name;
    this.description = description;
    this.tags = tags;
    this.nodes = [];
    this.connections = {};
  }

  add(name, type, typeVersion, position, parameters = {}, extra = {}) {
    if (this.nodes.some((n) => n.name === name)) throw new Error(`Duplicate node name: ${name}`);
    const node = { parameters, id: uuid(`${this.name}:${name}`), name, type, typeVersion, position, ...extra };
    this.nodes.push(node);
    return name;
  }

  /** Main-flow connection. `output` selects the source output (IF true = 0, false = 1). */
  link(from, to, output = 0, input = 0) {
    return this.#connect(from, to, "main", output, input);
  }

  /** Attach a sub-node (model, parser, tool…) to a root AI node. */
  attach(subNode, rootNode, type) {
    return this.#connect(subNode, rootNode, type, 0, 0);
  }

  #connect(from, to, type, output, input) {
    for (const n of [from, to]) if (!this.nodes.some((x) => x.name === n)) throw new Error(`Unknown node: ${n}`);
    const byType = (this.connections[from] ??= {});
    const outputs = (byType[type] ??= []);
    while (outputs.length <= output) outputs.push([]);
    outputs[output].push({ node: to, type, index: input });
    return this;
  }

  note(content, position, { width = 420, height = 300, color = 7 } = {}) {
    const name = `Note ${this.nodes.filter((n) => n.type === "n8n-nodes-base.stickyNote").length + 1}`;
    this.add(name, "n8n-nodes-base.stickyNote", 1, position, { content, height, width, color });
  }

  /** Assign credential references (used when deploying to a real instance). */
  withCredentials(map) {
    for (const node of this.nodes) {
      const cred = map[node.type];
      if (!cred) continue;
      // Plain HTTP requests (e.g. fetching a public page) don't take credentials.
      if (node.type === "n8n-nodes-base.httpRequest" && node.parameters.authentication !== "genericCredentialType") continue;
      node.credentials = { [cred.type]: { id: cred.id, name: cred.name } };
    }
    return this;
  }

  toJSON() {
    return {
      id: workflowId(this.name),
      name: this.name,
      nodes: this.nodes,
      connections: this.connections,
      settings: { executionOrder: "v1", saveManualExecutions: true, callerPolicy: "workflowsFromSameOwner" },
      pinData: {},
      meta: { templateCredsSetupCompleted: false, description: this.description },
      tags: this.tags.map((t) => ({ name: t })),
    };
  }
}

// ─── Node helpers ────────────────────────────────────────────────────────────

let seq = 0;
const fieldId = (s) => uuid(`field:${s}:${seq++}`);

export function webhook(wf, name, path, position) {
  return wf.add(
    name,
    "n8n-nodes-base.webhook",
    2.1,
    position,
    { httpMethod: "POST", path, responseMode: "responseNode", options: { allowedOrigins: "*" } },
    { webhookId: uuid(`webhook:${path}`) },
  );
}

/** Set node (v3.4). `fields` is [name, value, type?] — type defaults to string. */
export function set(wf, name, position, fields, { keepOthers = false } = {}) {
  return wf.add(name, "n8n-nodes-base.set", 3.4, position, {
    assignments: {
      assignments: fields.map(([n, value, type = "string"]) => ({ id: fieldId(`${wf.name}:${name}:${n}`), name: n, value, type })),
    },
    includeOtherFields: keepOthers,
    options: {},
  });
}

/** A single-condition filter (used by IF v2.2 and Switch v3.2 rules). */
export function condition(leftValue, operator, rightValue) {
  const c = { id: fieldId(`cond:${leftValue}`), leftValue, rightValue: rightValue ?? "", operator };
  if (rightValue === undefined) c.operator = { ...operator, singleValue: true };
  return {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
    conditions: [c],
    combinator: "and",
  };
}

export const op = {
  isTrue: { type: "boolean", operation: "true" },
  isFalse: { type: "boolean", operation: "false" },
  gte: { type: "number", operation: "gte" },
  equals: { type: "string", operation: "equals" },
  notEmpty: { type: "string", operation: "notEmpty" },
  arrayNotEmpty: { type: "array", operation: "notEmpty" },
};

export function ifNode(wf, name, position, cond) {
  return wf.add(name, "n8n-nodes-base.if", 2.2, position, { conditions: cond, looseTypeValidation: true, options: {} });
}

/** Switch v3.2 with named outputs. `rules` is [outputName, condition]. */
export function switchNode(wf, name, position, rules, fallback) {
  return wf.add(name, "n8n-nodes-base.switch", 3.2, position, {
    rules: { values: rules.map(([key, conditions]) => ({ conditions, renameOutput: true, outputKey: key })) },
    looseTypeValidation: true,
    options: fallback ? { fallbackOutput: "extra", renameFallbackOutput: fallback } : {},
  });
}

export function code(wf, name, position, jsCode, { perItem = false } = {}) {
  return wf.add(name, "n8n-nodes-base.code", 2, position, perItem ? { mode: "runOnceForEachItem", jsCode } : { jsCode });
}

export function respond(wf, name, position, responseBody = "={{ $json }}") {
  return wf.add(name, "n8n-nodes-base.respondToWebhook", 1.5, position, {
    respondWith: "json",
    responseBody,
    options: { responseHeaders: { entries: [{ name: "Cache-Control", value: "no-store" }] } },
  });
}

/**
 * Chat-model sub-node for the active provider.
 * Gemini: lmChatGoogleGemini v1.1 (`modelName` + options.temperature / maxOutputTokens). On Gemini 3.x
 *   maxOutputTokens also covers the hidden thinking tokens and the node has no thinking-budget option,
 *   so the cap is generous (8192): at 2048, Gemini 3.6 Flash spent it thinking and cut the JSON off.
 * Claude: lmChatAnthropic v1.6 (resource-locator `model` + options.maxTokensToSample).
 */
export function aiModel(wf, name, position, model = MODELS.fast, { temperature = 0.2, maxTokens = model.provider === "gemini" ? 8192 : 2048 } = {}) {
  if (model.provider === "anthropic") {
    return wf.add(name, PROVIDERS.anthropic.nodeType, 1.6, position, {
      model: { __rl: true, mode: "list", value: model.value, cachedResultName: model.name },
      options: { temperature, maxTokensToSample: maxTokens },
    });
  }
  return wf.add(name, PROVIDERS.gemini.nodeType, 1.1, position, {
    modelName: model.value,
    options: { temperature, maxOutputTokens: maxTokens },
  });
}

export function structuredParser(wf, name, position, schema) {
  return wf.add(name, "@n8n/n8n-nodes-langchain.outputParserStructured", 1.3, position, {
    schemaType: "manual",
    inputSchema: JSON.stringify(schema, null, 2),
  });
}

/** Basic LLM chain (v1.9) with a system prompt and a structured output parser. */
export function llmChain(wf, name, position, { system, prompt }) {
  return wf.add(name, "@n8n/n8n-nodes-langchain.chainLlm", 1.9, position, {
    promptType: "define",
    text: prompt,
    hasOutputParser: true,
    messages: { messageValues: [{ type: "SystemMessagePromptTemplate", message: system }] },
  });
}

/** LLM chain + chat model + structured parser, wired together below the chain. */
export function aiStep(wf, name, [x, y], { system, prompt, schema, model = MODELS.fast, temperature = 0.2, modelName, parserName }) {
  llmChain(wf, name, [x, y], { system, prompt });
  const m = aiModel(wf, modelName ?? model.name, [x - 60, y + 220], model, { temperature });
  const p = structuredParser(wf, parserName ?? `${name} · schema`, [x + 140, y + 220], schema);
  wf.attach(m, name, "ai_languageModel");
  wf.attach(p, name, "ai_outputParser");
  return name;
}

export function slackMessage(wf, name, position, channel, text) {
  return wf.add(name, "n8n-nodes-base.slack", 2.3, position, {
    select: "channel",
    channelId: { __rl: true, mode: "name", value: channel },
    text,
    otherOptions: { includeLinkToWorkflow: false },
  });
}

/** Google Sheets append with explicit column mapping. */
export function sheetsAppend(wf, name, position, tab, columns) {
  const value = Object.fromEntries(columns.map(([col, expr]) => [col, expr]));
  return wf.add(name, "n8n-nodes-base.googleSheets", 4.5, position, {
    operation: "append",
    documentId: { __rl: true, mode: "url", value: "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit" },
    sheetName: { __rl: true, mode: "name", value: tab },
    columns: {
      mappingMode: "defineBelow",
      value,
      matchingColumns: [],
      schema: columns.map(([col]) => ({
        id: col,
        displayName: col,
        required: false,
        defaultMatch: false,
        display: true,
        type: "string",
        canBeUsedToMatch: true,
      })),
    },
    options: {},
  });
}

export function schema(properties, required = Object.keys(properties)) {
  return { type: "object", properties, required, additionalProperties: false };
}
