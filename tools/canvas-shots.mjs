// Re-takes the gallery site's canvas screenshots from the local n8n-dev container.
//
//   npm run e2e                                                     # imports dist/e2e into the container first
//   node --env-file=infra/.env.local-dev tools/canvas-shots.mjs [--variant full|card|all] [--themes dark,light] [--only slug]
//
//   full → site/public/canvas/<slug>-{theme}.png       1798×899  (2:1; the workflows as imported, sticky notes included)
//   card → site/public/canvas/<slug>-card-{theme}.png  1798×1013 (16:9, no sticky notes: the script imports sticky-free
//          copies of dist/e2e, shoots them, then re-imports and republishes the originals and restarts the container)
//
// Logs into n8n with the dev owner, opens each workflow, hides everything n8n draws over the canvas, grows the
// viewport until the canvas element is exactly the target size, presses "1" (zoom to fit) and saves the canvas element.
//
// Env: N8N_DEV_URL, N8N_DEV_EMAIL, N8N_DEV_PASSWORD, N8N_CONTAINER (default n8n-dev),
//      CHROME_PATH (default: Chrome's usual install path; playwright-core drives the installed browser, no download)
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const variants = arg("--variant", "all") === "all" ? ["full", "card"] : [arg("--variant")];
const themes = arg("--themes", "dark,light").split(",");
const only = arg("--only", null);

const base = process.env.N8N_DEV_URL ?? "http://localhost:5690";
const container = process.env.N8N_CONTAINER ?? "n8n-dev";
const chromePath =
  process.env.CHROME_PATH ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"].find(existsSync);
if (!chromePath) throw new Error("Chrome not found — set CHROME_PATH");
if (!process.env.N8N_DEV_EMAIL) throw new Error("run with node --env-file=infra/.env.local-dev");

const e2eDir = join(root, "dist/e2e");
if (!existsSync(e2eDir)) throw new Error("dist/e2e is missing — run `npm run e2e` first");
const outDir = join(root, "site/public/canvas");
mkdirSync(outDir, { recursive: true });

const sh = (cmd, a) => execFileSync(cmd, a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STICKY = "n8n-nodes-base.stickyNote";
const WEBHOOK = "n8n-nodes-base.webhook";
const SIZES = { full: { width: 1798, height: 899 }, card: { width: 1798, height: 1013 } };

const catalog = JSON.parse(readFileSync(join(root, "workflows/catalog.json"), "utf8"));
const workflows = readdirSync(e2eDir)
  .filter((f) => /^\d.*\.json$/.test(f))
  .sort()
  .map((file) => ({ file, slug: catalog.find((c) => c.file === file)?.slug ?? "error-alerts", json: JSON.parse(readFileSync(join(e2eDir, file), "utf8")) }));

// Everything n8n 2.40 draws over the canvas: zoom controls, the (split) Execute button, the right-hand action
// column, the Editor/Executions/Evaluations switch that overflows the header, banners and toasts.
const HIDE_CSS = `
  [data-test-id="canvas-controls"], [data-test-id="execute-workflow-button"], [class*="_executionButtons_"],
  *:has(> * > [data-test-id="execute-workflow-button"]), *:has(> * > [data-test-id="node-creator-plus-button"]),
  [data-test-id="node-creator-plus-button"], [data-test-id="command-bar-button"], [data-test-id="add-sticky-button"],
  [data-test-id="toggle-focus-panel-button"], [data-test-id="instance-ai-canvas-action-button"],
  .vue-flow__panel, .vue-flow__minimap, [data-test-id="banners"], .el-notification, .el-message,
  header[class*="_header_"], *:has(> [data-test-id="radio-button-workflow"]),
  *:has(> * > [data-test-id="radio-button-workflow"]) { visibility: hidden !important; }
`;

function importDir(dir) {
  sh("docker", ["exec", container, "sh", "-c", "mkdir -p /tmp/wf"]);
  for (const { file } of workflows) {
    sh("docker", ["cp", join(dir, file), `${container}:/tmp/wf/${file}`]);
    sh("docker", ["exec", container, "n8n", "import:workflow", `--input=/tmp/wf/${file}`]);
  }
}

// Put dist/e2e back exactly as `npm run e2e` leaves it: imported, webhook workflows published, container restarted.
async function restoreFull() {
  importDir(e2eDir);
  for (const { json } of workflows) if (json.nodes.some((n) => n.type === WEBHOOK)) sh("docker", ["exec", container, "n8n", "publish:workflow", `--id=${json.id}`]);
  sh("docker", ["restart", container]);
  // /healthz goes green a few seconds before the webhooks are registered, so probe one with GET:
  // Express answers "Cannot GET" until n8n has registered it, then n8n answers a JSON 404
  // ("not registered for GET requests") without running the workflow.
  const hook = workflows.flatMap(({ json }) => json.nodes).find((n) => n.type === WEBHOOK)?.parameters.path;
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${base}/webhook/${hook}`);
      if ((res.headers.get("content-type") ?? "").includes("json")) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("n8n did not register its webhooks after the restart");
}

async function shoot(browser, variant) {
  const target = SIZES[variant];
  for (const theme of themes) {
    const context = await browser.newContext({ viewport: { width: 1900, height: 1100 }, deviceScaleFactor: 1, colorScheme: theme === "dark" ? "dark" : "light" });
    await context.addInitScript((t) => localStorage.setItem("N8N_THEME", t), theme);
    const login = await context.request.post(`${base}/rest/login`, { data: { emailOrLdapLoginId: process.env.N8N_DEV_EMAIL, password: process.env.N8N_DEV_PASSWORD } });
    if (!login.ok()) throw new Error(`login failed: ${login.status()}`);
    const page = await context.newPage();

    for (const { slug, json } of workflows) {
      if (only && slug !== only) continue;
      const expected = variant === "card" ? json.nodes.filter((n) => n.type !== STICKY).length : json.nodes.length;
      await page.goto(`${base}/workflow/${json.id}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction((n) => document.querySelectorAll(".vue-flow__node").length === n, expected, { timeout: 45_000 });
      await page.addStyleTag({ content: HIDE_CSS });
      await page.keyboard.press("Escape");

      // Grow the viewport until the canvas element is exactly the target size (chrome offsets differ per version).
      const canvas = page.locator('[data-test-id="canvas"]');
      let box = await canvas.boundingBox();
      for (let i = 0; i < 3 && (Math.round(box.width) !== target.width || Math.round(box.height) !== target.height); i++) {
        const vp = page.viewportSize();
        await page.setViewportSize({ width: Math.round(vp.width + target.width - box.width), height: Math.round(vp.height + target.height - box.height) });
        await sleep(400);
        box = await canvas.boundingBox();
      }
      if (Math.round(box.width) !== target.width || Math.round(box.height) !== target.height)
        throw new Error(`${slug}: canvas is ${box.width}×${box.height}, wanted ${target.width}×${target.height}`);

      await page.mouse.click(box.x + box.width - 30, box.y + box.height - 30); // focus the canvas on an empty corner
      await page.keyboard.press("1");
      await sleep(1000);
      const file = variant === "card" ? `${slug}-card-${theme}.png` : `${slug}-${theme}.png`;
      await canvas.screenshot({ path: join(outDir, file) });
      console.log(`✓ ${file}  (${expected} nodes)`);
    }
    await context.close();
  }
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const variant of variants) {
    if (variant === "full") {
      await shoot(browser, "full");
    } else if (variant === "card") {
      const cardDir = join(root, "dist/card");
      mkdirSync(cardDir, { recursive: true });
      for (const { file, json } of workflows) writeFileSync(join(cardDir, file), JSON.stringify({ ...json, nodes: json.nodes.filter((n) => n.type !== STICKY) }, null, 2));
      console.log("Importing sticky-free copies for the card thumbnails…");
      importDir(cardDir);
      try {
        await shoot(browser, "card");
      } finally {
        console.log("Restoring the full workflows (import, publish, restart)…");
        await restoreFull();
      }
    } else {
      throw new Error(`unknown variant "${variant}" (full | card | all)`);
    }
  }
} finally {
  await browser.close();
}
console.log(`Wrote screenshots to ${outDir}`);
