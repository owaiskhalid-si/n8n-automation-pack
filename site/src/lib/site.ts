export const site = {
  name: "Flowbench",
  description:
    "Seven production-ready n8n automations — AI lead qualification, invoice extraction, support triage, content repurposing, booking reminders and KPI reports — with live demos, $0 self-hosting on Oracle Cloud (Terraform for AWS included) and end-to-end tests.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  repoUrl: process.env.NEXT_PUBLIC_REPO_URL ?? "",
  authorName: process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "",
  authorUrl: process.env.NEXT_PUBLIC_AUTHOR_URL ?? "",
};
