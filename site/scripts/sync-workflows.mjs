// Copies the generated workflow JSON (../workflows) into the site so templates can be
// downloaded from /workflows/<file>.json, and exposes catalog.json to the app.
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const src = new URL("../../workflows/", import.meta.url);
const pub = new URL("../public/workflows/", import.meta.url);
await mkdir(pub, { recursive: true });
const files = (await readdir(src)).filter((f) => f.endsWith(".json"));
for (const f of files) await copyFile(new URL(f, src), new URL(f, pub));
await copyFile(new URL("catalog.json", src), new URL("../src/content/catalog.json", import.meta.url));
console.log(`synced ${files.length} files → ${join("public", "workflows")}`);
