// Generates importable n8n workflow JSON from the definitions in ./workflows.
//
//   node tools/build.mjs                         → ./workflows/*.json (clean templates)
//   node tools/build.mjs --out dist/instance \
//     --credentials infra/credentials.local.json  → same, with credential IDs for a real instance
//     --protect                                   → webhooks require the X-Demo-Key header credential
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? true) : null;
};

const outDir = join(root, flag("--out") ?? "workflows");
const credsPath = flag("--credentials");
const protect = args.includes("--protect");
const creds = credsPath ? JSON.parse(await readFile(join(root, credsPath), "utf8")) : null;

const defsDir = join(root, "tools", "workflows");
const files = (await readdir(defsDir)).filter((f) => f.endsWith(".mjs")).sort();
await mkdir(outDir, { recursive: true });

const catalog = [];
for (const file of files) {
  const mod = await import(pathToFileURL(join(defsDir, file)).href);
  const wf = mod.build();
  if (creds) wf.withCredentials(creds);
  if (protect) {
    const key = creds?.["webhookHeaderAuth"];
    if (!key) throw new Error("--protect needs a webhookHeaderAuth entry in the credentials file");
    for (const node of wf.nodes.filter((n) => n.type === "n8n-nodes-base.webhook")) {
      node.parameters.authentication = "headerAuth";
      node.credentials = { httpHeaderAuth: { id: key.id, name: key.name } };
    }
  }
  const json = wf.toJSON();
  await writeFile(join(outDir, mod.meta.file), JSON.stringify(json, null, 2) + "\n");
  catalog.push({
    file: mod.meta.file,
    slug: mod.meta.slug,
    name: json.name,
    description: json.meta.description,
    tags: json.tags.map((t) => t.name),
    nodeCount: json.nodes.filter((n) => n.type !== "n8n-nodes-base.stickyNote").length,
    webhooks: json.nodes.filter((n) => n.type === "n8n-nodes-base.webhook").map((n) => n.parameters.path),
    integrations: [...new Set(json.nodes.map((n) => n.type.split(".").pop()).filter((t) => !["stickyNote", "set", "if", "switch", "code", "respondToWebhook"].includes(t)))],
  });
  console.log(`✓ ${mod.meta.file}  (${json.nodes.length} nodes)`);
}
await writeFile(join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`\nWrote ${catalog.length} workflows to ${outDir}`);
