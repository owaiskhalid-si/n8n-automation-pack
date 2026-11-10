import { BotIcon, GitBranchIcon, MailIcon, MessageSquareIcon, SheetIcon, WebhookIcon } from "lucide-react";

interface GraphNode {
  id: string;
  x: number;
  y: number;
  w?: number;
  label: string;
  sub?: string;
  Icon: typeof WebhookIcon;
  accent?: boolean;
}

const nodes: GraphNode[] = [
  { id: "hook", x: 30, y: 150, label: "Webhook", sub: "POST /lead", Icon: WebhookIcon },
  { id: "ai", x: 170, y: 150, w: 160, label: "Qualify lead", sub: "Gemini Flash-Lite", Icon: BotIcon, accent: true },
  { id: "route", x: 370, y: 150, label: "Hot lead?", sub: "score ≥ 70", Icon: GitBranchIcon },
  { id: "slack", x: 530, y: 40, label: "Slack", sub: "#sales", Icon: MessageSquareIcon },
  { id: "sheets", x: 530, y: 150, label: "Sheets", sub: "CRM row", Icon: SheetIcon },
  { id: "gmail", x: 530, y: 260, label: "Gmail", sub: "reply draft", Icon: MailIcon },
];

const H = 64;
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const out = (n: GraphNode) => [n.x + (n.w ?? H), n.y + H / 2] as const;
const inn = (n: GraphNode) => [n.x, n.y + H / 2] as const;

function wire(a: string, b: string) {
  const [x1, y1] = out(byId[a]);
  const [x2, y2] = inn(byId[b]);
  const dx = Math.max(40, (x2 - x1) / 2);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

const wires = [
  ["hook", "ai"],
  ["ai", "route"],
  ["route", "slack"],
  ["route", "sheets"],
  ["route", "gmail"],
] as const;

/** Animated n8n-style canvas for the dark tile: cobalt packets travel along the wires, no JS needed. */
export function HeroGraph() {
  return (
    <svg viewBox="0 0 620 360" className="h-auto w-full" role="img" aria-label="An n8n workflow: webhook to Gemini to a router that updates Slack, Google Sheets and Gmail">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {wires.map(([a, b]) => (
        <path key={`${a}-${b}`} d={wire(a, b)} fill="none" stroke="var(--inverse-line)" strokeWidth={2} />
      ))}
      {wires.map(([a, b], i) => (
        <path key={`f-${a}-${b}`} d={wire(a, b)} fill="none" stroke="var(--signal)" strokeOpacity={0.6} strokeWidth={2} className="wire-flow" style={{ animationDelay: `${i * -0.3}s` }} />
      ))}
      {wires.map(([a, b], i) => (
        <circle key={`p-${a}-${b}`} r={4} fill="var(--signal)" filter="url(#glow)">
          <animateMotion dur="2.4s" begin={`${i < 2 ? i * 0.6 : 1.2}s`} repeatCount="indefinite" path={wire(a, b)} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        </circle>
      ))}

      {nodes.map((n) => {
        const w = n.w ?? H;
        return (
          <g key={n.id}>
            {n.accent && <rect x={n.x - 6} y={n.y - 6} width={w + 12} height={H + 12} rx={38} fill="var(--signal)" opacity={0.16} />}
            <rect
              x={n.x}
              y={n.y}
              width={w}
              height={H}
              rx={H / 2}
              fill="var(--inverse-surface)"
              stroke={n.accent ? "var(--signal)" : "var(--inverse-line)"}
              strokeWidth={n.accent ? 1.5 : 1}
            />
            <circle cx={n.x} cy={n.y + H / 2} r={4} fill="var(--inverse)" stroke="var(--inverse-line)" />
            <circle cx={n.x + w} cy={n.y + H / 2} r={4} fill="var(--inverse)" stroke="var(--inverse-line)" />
            <n.Icon
              x={n.x + (n.w ? 20 : w / 2 - 12)}
              y={n.y + H / 2 - 12}
              width={24}
              height={24}
              color={n.accent ? "var(--signal)" : "var(--inverse-foreground)"}
              strokeWidth={1.6}
            />
            {n.w ? (
              <>
                <text x={n.x + 54} y={n.y + 28} fill="var(--inverse-foreground)" className="text-[14px] font-semibold">
                  {n.label}
                </text>
                <text x={n.x + 54} y={n.y + 45} fill="var(--inverse-muted)" className="text-[11px]">
                  {n.sub}
                </text>
              </>
            ) : (
              <>
                <text x={n.x + w / 2} y={n.y + H + 18} textAnchor="middle" fill="var(--inverse-foreground)" className="text-[13px] font-semibold">
                  {n.label}
                </text>
                <text x={n.x + w / 2} y={n.y + H + 32} textAnchor="middle" fill="var(--inverse-muted)" className="text-[11px]">
                  {n.sub}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
