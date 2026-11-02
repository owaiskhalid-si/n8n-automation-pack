// Real responses recorded from the workflows running in n8n. Served when the live
// backend isn't configured (or is unreachable), and clearly labelled as samples.
import leadQualifier from "./samples/lead-qualifier.json";
import invoiceExtractor from "./samples/invoice-extractor.json";
import supportTriage from "./samples/support-triage.json";
import contentRepurposer from "./samples/content-repurposer.json";
import noShowRecovery from "./samples/no-show-recovery.json";
import kpiReport from "./samples/kpi-report.json";

export const samples: Record<string, unknown> = {
  "lead-qualifier": leadQualifier,
  "invoice-extractor": invoiceExtractor,
  "support-triage": supportTriage,
  "content-repurposer": contentRepurposer,
  "no-show-recovery": noShowRecovery,
  "kpi-report": kpiReport,
};
