import { z } from "zod";
import type { Workflow } from "@/content/workflows";

/** Builds the request schema for a demo straight from its form definition. */
export function schemaFor(doc: Workflow) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of doc.demo?.fields ?? []) {
    if (f.type === "number") {
      shape[f.name] = z.coerce.number().int().min(0).max(999).optional();
      continue;
    }
    let s = z.string().trim().max(f.maxLength);
    if (f.required) s = s.min(1, `${f.label} is required`);
    shape[f.name] = f.type === "email" ? s.pipe(z.union([z.literal(""), z.email("Enter a valid email")])) : s;
    if (!f.required) shape[f.name] = shape[f.name].optional();
  }
  const schema = z.object(shape);
  if (doc.slug === "content-repurposer") {
    return schema.refine((v) => Boolean(v.url || v.text), { message: "Add a URL or some text", path: ["text"] });
  }
  return schema;
}
