import { AI, aiStep, code, condition, ifNode, op, respond, schema, set, switchNode, webhook, Workflow } from "../lib.mjs";

export const meta = {
  slug: "no-show-recovery",
  file: "05-appointment-reminders-no-show-recovery.json",
};

const pickRemindersJs = `// Decide which appointments need a 24-hour or 2-hour reminder right now.
const config = $('Config').first().json;
const now = DateTime.now();
const out = [];

for (const { json: appt } of $input.all()) {
  if (appt.status && appt.status !== 'confirmed') continue;
  const startsAt = DateTime.fromISO(appt.startsAt);
  const hoursUntil = startsAt.diff(now, 'hours').hours;
  let reminderType = null;
  if (hoursUntil > 0 && hoursUntil <= 2 && !appt.reminder2hSentAt) reminderType = '2h';
  else if (hoursUntil > 2 && hoursUntil <= 24 && !appt.reminder24hSentAt) reminderType = '24h';
  if (!reminderType) continue;

  const when = startsAt.setZone(config.timezone).toFormat("cccc, LLL d 'at' h:mm a");
  const first = String(appt.customerName || '').split(' ')[0] || 'there';
  const message = reminderType === '24h'
    ? \`Hi \${first}, a reminder of your \${appt.service} with \${appt.staffName} at \${config.businessName} on \${when}. Need to change it? \${config.manageUrl}/\${appt.id}\`
    : \`Hi \${first}, see you soon! Your \${appt.service} at \${config.businessName} starts at \${startsAt.setZone(config.timezone).toFormat('h:mm a')}.\`;

  out.push({
    json: {
      appointmentId: appt.id,
      reminderType,
      channel: appt.phone ? 'sms' : 'email',
      phone: appt.phone,
      email: appt.email,
      customerName: appt.customerName,
      subject: \`Reminder: \${appt.service} \${reminderType === '24h' ? 'tomorrow' : 'today'}\`,
      message,
    },
  });
}
return out;`;

export function build() {
  const wf = new Workflow("Appointment Reminders & No-show Recovery", {
    description: "For salons, clinics and service businesses: sends 24-hour and 2-hour SMS/email reminders from your booking system every 15 minutes, and turns no-shows into rebookings with a personalised AI message.",
    tags: ["AI", "Booking", "SMS"],
  });

  wf.note(
    [
      "## 1 · Appointment reminders (every 15 min)",
      "Pulls confirmed appointments for the next 25 hours from your booking API, picks the ones due a **24h** or **2h** reminder, sends SMS (Twilio) or email, then marks them as sent so nobody is messaged twice.",
      "",
      "**Booking API contract**",
      "`GET /appointments?from&to` → `[{ id, customerName, phone, email, service, staffName, startsAt, status, reminder24hSentAt, reminder2hSentAt }]`",
      "`PATCH /appointments/:id/reminders` → `{ type, sentAt }`",
      "",
      "Edit business name, timezone and URLs in **Config**.",
    ].join("\n"),
    [-480, -120],
    { width: 440, height: 400, color: 4 },
  );

  wf.add("Every 15 minutes", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 60], { rule: { interval: [{ field: "minutes", minutesInterval: 15 }] } });
  set(wf, "Config", [220, 60], [
    ["businessName", "Maple Dental"],
    ["timezone", "America/Toronto"],
    ["bookingApiUrl", "https://your-booking-app.example.com/api"],
    ["manageUrl", "https://your-booking-app.example.com/manage"],
  ]);
  wf.add("Fetch upcoming appointments", "n8n-nodes-base.httpRequest", 4.2, [440, 60], {
    url: "={{ $json.bookingApiUrl }}/appointments",
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: "from", value: "={{ $now.toISO() }}" },
        { name: "to", value: "={{ $now.plus({ hours: 25 }).toISO() }}" },
        { name: "status", value: "confirmed" },
      ],
    },
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    options: {},
  });
  code(wf, "Pick reminders due", [660, 60], pickRemindersJs);
  switchNode(wf, "SMS or email?", [880, 60], [
    ["SMS", condition("={{ $json.channel }}", op.equals, "sms")],
    ["Email", condition("={{ $json.channel }}", op.equals, "email")],
  ]);
  wf.add("Send SMS reminder", "n8n-nodes-base.twilio", 1, [1120, -40], {
    from: "+15555550100",
    to: "={{ $json.phone }}",
    message: "={{ $json.message }}",
    options: {},
  });
  wf.add("Send email reminder", "n8n-nodes-base.emailSend", 2.1, [1120, 160], {
    fromEmail: "Maple Dental <appointments@example.com>",
    toEmail: "={{ $json.email }}",
    subject: "={{ $json.subject }}",
    emailFormat: "text",
    text: "={{ $json.message }}",
    options: {},
  });
  wf.add("Mark reminder sent", "n8n-nodes-base.httpRequest", 4.2, [1360, 60], {
    method: "PATCH",
    url: "={{ $('Config').first().json.bookingApiUrl }}/appointments/{{ $('Pick reminders due').item.json.appointmentId }}/reminders",
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ { type: $('Pick reminders due').item.json.reminderType, sentAt: $now.toISO() } }}",
    options: {},
  });

  wf.note(
    [
      "## 2 · No-show recovery",
      "Your booking system calls this webhook when an appointment is marked **no-show**. " + AI.name + " writes a warm, non-judgemental rebooking message (SMS + email versions) and Twilio sends it.",
      "",
      "`POST { customerName, service, missedAt, rebookUrl, businessName, phone }`",
    ].join("\n"),
    [-480, 420],
    { width: 440, height: 260, color: 5 },
  );

  webhook(wf, "No-show webhook", "no-show-recovery", [0, 540]);
  set(wf, "No-show details", [220, 540], [
    ["customerName", "={{ $json.body.customerName || 'there' }}"],
    ["firstName", "={{ String($json.body.customerName || 'there').split(' ')[0] }}"],
    ["service", "={{ $json.body.service || 'appointment' }}"],
    ["missedAt", "={{ $json.body.missedAt || $now.toISO() }}"],
    ["businessName", "={{ $json.body.businessName || 'Maple Dental' }}"],
    ["rebookUrl", "={{ $json.body.rebookUrl || 'https://your-booking-app.example.com/book' }}"],
    ["phone", "={{ $json.body.phone || '' }}"],
    ["visits", "={{ Number($json.body.previousVisits || 0) }}", "number"],
    ["demo", "={{ $json.body.demo === true }}", "boolean"],
  ]);
  aiStep(wf, "Write rebooking message", [460, 540], {
    temperature: 0.6,
    parserName: "Message schema",
    system: [
      "You write short, human messages for a local service business after a customer misses an appointment.",
      "Tone: warm, zero guilt, assume life got in the way. Make rebooking effortless.",
      "- sms: under 300 characters, first name, one link, no emojis beyond one",
      "- emailSubject: under 60 characters",
      "- emailBody: 3 short paragraphs, sign off with the business name",
      "Loyal customers (3+ previous visits) get a slightly more personal note.",
    ].join("\n"),
    prompt:
      "=Customer: {{ $json.customerName }} (first name {{ $json.firstName }}, {{ $json.visits }} previous visits)\nMissed: {{ $json.service }} at {{ $json.businessName }}, {{ DateTime.fromISO($json.missedAt).toFormat('cccc LLL d, h:mm a') }}\nRebooking link: {{ $json.rebookUrl }}",
    schema: schema({
      sms: { type: "string" },
      emailSubject: { type: "string" },
      emailBody: { type: "string" },
    }),
  });
  respond(wf, "Return message", [760, 420], "={{ { ok: true, ...$json.output } }}");
  ifNode(wf, "Live run and has phone?", [760, 640], {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
    conditions: [
      { id: "5d0c9f10-6a3b-4bd1-8f21-2f7d1c0e9a01", leftValue: "={{ $('No-show details').item.json.demo }}", rightValue: "", operator: { type: "boolean", operation: "false", singleValue: true } },
      { id: "5d0c9f10-6a3b-4bd1-8f21-2f7d1c0e9a02", leftValue: "={{ $('No-show details').item.json.phone }}", rightValue: "", operator: { type: "string", operation: "notEmpty", singleValue: true } },
    ],
    combinator: "and",
  });
  wf.add("Text the customer", "n8n-nodes-base.twilio", 1, [1000, 620], {
    from: "+15555550100",
    to: "={{ $('No-show details').item.json.phone }}",
    message: "={{ $json.output.sms }}",
    options: {},
  });

  wf.link("Every 15 minutes", "Config");
  wf.link("Config", "Fetch upcoming appointments");
  wf.link("Fetch upcoming appointments", "Pick reminders due");
  wf.link("Pick reminders due", "SMS or email?");
  wf.link("SMS or email?", "Send SMS reminder", 0);
  wf.link("SMS or email?", "Send email reminder", 1);
  wf.link("Send SMS reminder", "Mark reminder sent");
  wf.link("Send email reminder", "Mark reminder sent");

  wf.link("No-show webhook", "No-show details");
  wf.link("No-show details", "Write rebooking message");
  wf.link("Write rebooking message", "Return message");
  wf.link("Write rebooking message", "Live run and has phone?");
  wf.link("Live run and has phone?", "Text the customer", 0);
  return wf;
}
