// Static validation of generated workflows against n8n's own node definitions.
//
//   N8N_NODES_JSON=path/to/nodes.json node tools/validate.mjs [dir]
//
// nodes.json comes from the n8n image: each package ships dist/types/nodes.json with bare
// node names (e.g. "stickyNote"), so prefix them with the package name when merging;
// CI copies it out of the same image version we deploy.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2] ?? "workflows";
const defs = process.env.N8N_NODES_JSON ? JSON.parse(await readFile(process.env.N8N_NODES_JSON, "utf8")) : null;
if (!defs) console.warn("! N8N_NODES_JSON not set — skipping node/parameter checks");

const findDef = (type, version) => defs?.find((d) => d.name === type && [].concat(d.version).includes(version));
const AI_ROOTS = ["@n8n/n8n-nodes-langchain.chainLlm", "@n8n/n8n-nodes-langchain.informationExtractor", "@n8n/n8n-nodes-langchain.agent", "@n8n/n8n-nodes-langchain.textClassifier"];

let errors = 0;
const fail = (wf, msg) => {
  errors++;
  console.error(`✗ ${wf}: ${msg}`);
};
const paths = new Map();

for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "catalog.json").sort()) {
  const wf = JSON.parse(await readFile(join(dir, file), "utf8"));
  const names = new Set(wf.nodes.map((n) => n.name));
  if (names.size !== wf.nodes.length) fail(file, "duplicate node names");

  for (const node of wf.nodes) {
    if (defs) {
      const def = findDef(node.type, node.typeVersion);
      if (!def) {
        fail(file, `${node.name}: unknown node ${node.type} v${node.typeVersion}`);
        continue;
      }
      const known = new Set(def.properties.map((p) => p.name));
      for (const [key, value] of Object.entries(node.parameters)) {
        if (!known.has(key)) {
          fail(file, `${node.name}: unknown parameter "${key}"`);
          continue;
        }
        // One level deeper for collections (e.g. `options`), where typos are silently ignored by n8n.
        const collections = def.properties.filter((p) => p.name === key && p.type === "collection");
        if (collections.length && value && typeof value === "object") {
          const childNames = new Set(collections.flatMap((p) => (p.options ?? []).map((o) => o.name)));
          for (const child of Object.keys(value)) if (!childNames.has(child)) fail(file, `${node.name}: unknown option "${key}.${child}"`);
        }
      }
    }
    if (node.type === "n8n-nodes-base.webhook") {
      const p = node.parameters.path;
      if (paths.has(p)) fail(file, `webhook path "${p}" already used in ${paths.get(p)}`);
      paths.set(p, file);
      if (!node.webhookId) fail(file, `${node.name}: missing webhookId`);
    }
  }

  const incoming = new Map();
  for (const [from, byType] of Object.entries(wf.connections)) {
    if (!names.has(from)) fail(file, `connection from unknown node "${from}"`);
    for (const [type, outputs] of Object.entries(byType))
      for (const out of outputs)
        for (const c of out) {
          if (!names.has(c.node)) fail(file, `connection to unknown node "${c.node}"`);
          incoming.set(`${c.node}:${type}`, true);
        }
  }
  for (const node of wf.nodes.filter((n) => AI_ROOTS.includes(n.type)))
    if (!incoming.has(`${node.name}:ai_languageModel`)) fail(file, `${node.name}: no language model attached`);
  for (const node of wf.nodes.filter((n) => n.type === "n8n-nodes-base.respondToWebhook")) {
    // Respond nodes must be reachable from a webhook.
    const parents = new Map();
    for (const [from, byType] of Object.entries(wf.connections))
      for (const out of byType.main ?? []) for (const c of out) parents.set(c.node, [...(parents.get(c.node) ?? []), from]);
    const seen = new Set();
    const stack = [node.name];
    let ok = false;
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n)) continue;
      seen.add(n);
      if (wf.nodes.find((x) => x.name === n)?.type === "n8n-nodes-base.webhook") ok = true;
      stack.push(...(parents.get(n) ?? []));
    }
    if (!ok) fail(file, `${node.name}: not reachable from a webhook`);
  }
  console.log(`${errors ? "…" : "✓"} ${file}`);
}

if (errors) {
  console.error(`\n${errors} problem(s) found`);
  process.exit(1);
}
console.log("\nAll workflows valid.");
