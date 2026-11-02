import { set, slackMessage, Workflow } from "../lib.mjs";

export const meta = {
  slug: null,
  file: "07-global-error-alerts.json",
};

export function build() {
  const wf = new Workflow("Global Error Alerts — Slack + email when any workflow fails", {
    description: "Set this as the error workflow for every production workflow: failures are posted to Slack and emailed with the workflow, failing node, error message and a direct link to the execution.",
    tags: ["Ops", "Monitoring"],
  });

  wf.note(
    [
      "## Global error alerts",
      "In each production workflow: **Settings → Error workflow → Global Error Alerts**.",
      "",
      "Every failure is posted to `#alerts` and emailed with a link straight to the failed execution.",
    ].join("\n"),
    [-440, -20],
    { width: 380, height: 220, color: 3 },
  );

  wf.add("On workflow error", "n8n-nodes-base.errorTrigger", 1, [0, 100], {});
  set(wf, "Format alert", [220, 100], [
    ["workflow", "={{ $json.workflow.name }}"],
    ["node", "={{ $json.execution.lastNodeExecuted || 'unknown' }}"],
    ["message", "={{ String($json.execution.error?.message || 'Unknown error').slice(0, 500) }}"],
    ["url", "={{ $json.execution.url || '' }}"],
    ["mode", "={{ $json.execution.mode }}"],
    ["at", "={{ $now.setZone('America/Toronto').toFormat('LLL d, HH:mm ZZZZ') }}"],
  ]);
  slackMessage(
    wf,
    "Post to #alerts",
    [440, 20],
    "#alerts",
    "=:red_circle: *{{ $json.workflow }}* failed at *{{ $json.node }}* ({{ $json.at }})\n```{{ $json.message }}```\n{{ $json.url ? '<' + $json.url + '|Open execution>' : '' }}",
  );
  wf.add("Email on-call", "n8n-nodes-base.emailSend", 2.1, [440, 200], {
    fromEmail: "n8n <alerts@example.com>",
    toEmail: "oncall@example.com",
    subject: "=[n8n] {{ $json.workflow }} failed",
    emailFormat: "text",
    text: "=Workflow: {{ $json.workflow }}\nNode: {{ $json.node }}\nWhen: {{ $json.at }}\nMode: {{ $json.mode }}\n\n{{ $json.message }}\n\n{{ $json.url }}",
    options: {},
  });

  wf.link("On workflow error", "Format alert");
  wf.link("Format alert", "Post to #alerts");
  wf.link("Format alert", "Email on-call");
  return wf;
}
