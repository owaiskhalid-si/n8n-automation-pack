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
  color: string;
}

const nodes: GraphNode[] = [
  { id: "hook", x: 30, y: 150, label: "Webhook", sub: "POST /lead", Icon: WebhookIcon, color: "#ff6d5a" },
  { id: "ai", x: 170, y: 150, w: 160, label: "Qualify lead", sub: "Gemini Flash-Lite", Icon: BotIcon, accent: true, color: "var(--amber-fill)" },
  { id: "route", x: 370, y: 150, label: "Hot lead?", sub: "score ≥ 70", Icon: GitBranchIcon, color: "#34c38f" },
  { id: "slack", x: 530, y: 40, label: "Slack", sub: "#sales", Icon: MessageSquareIcon, color: "#e0a0ff" },
  { id: "sheets", x: 530, y: 150, label: "Sheets", sub: "CRM row", Icon: SheetIcon, color: "#34c38f" },
  { id: "gmail", x: 530, y: 260, label: "Gmail", sub: "reply draft", Icon: MailIcon, color: "#ff8a7a" },
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

/** Animated n8n-style canvas: data packets travel along the wires, no JS needed. */
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
        <path key={`${a}-${b}`} d={wire(a, b)} fill="none" className="stroke-line-2" strokeWidth={2} />
      ))}
      {wires.map(([a, b], i) => (
        <path key={`f-${a}-${b}`} d={wire(a, b)} fill="none" stroke="var(--amber-fill)" strokeOpacity={0.55} strokeWidth={2} className="wire-flow" style={{ animationDelay: `${i * -0.3}s` }} />
      ))}
      {wires.map(([a, b], i) => (
        <circle key={`p-${a}-${b}`} r={4} fill="var(--amber-fill)" filter="url(#glow)">
          <animateMotion dur="2.4s" begin={`${i < 2 ? i * 0.6 : 1.2}s`} repeatCount="indefinite" path={wire(a, b)} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        </circle>
      ))}

      {nodes.map((n) => {
        const w = n.w ?? H;
        return (
          <g key={n.id}>
            {n.accent && <rect x={n.x - 6} y={n.y - 6} width={w + 12} height={H + 12} rx={16} fill="var(--amber-fill)" opacity={0.08} />}
            <rect
              x={n.x}
              y={n.y}
              width={w}
              height={H}
              rx={12}
              className="fill-raised"
              stroke={n.accent ? "var(--amber-fill)" : "var(--line-2)"}
              strokeWidth={n.accent ? 1.5 : 1}
            />
            <circle cx={n.x} cy={n.y + H / 2} r={4} className="fill-surface stroke-line-2" />
            <circle cx={n.x + w} cy={n.y + H / 2} r={4} className="fill-surface stroke-line-2" />
            <n.Icon x={n.x + (n.w ? 16 : w / 2 - 13)} y={n.y + H / 2 - 13} width={26} height={26} color={n.color} strokeWidth={1.75} />
            {n.w ? (
              <>
                <text x={n.x + 52} y={n.y + 28} className="fill-ink text-[13px] font-medium">
                  {n.label}
                </text>
                <text x={n.x + 52} y={n.y + 45} className="fill-ink-3 font-mono text-[10px]">
                  {n.sub}
                </text>
              </>
            ) : (
              <>
                <text x={n.x + w / 2} y={n.y + H + 18} textAnchor="middle" className="fill-ink text-[12px] font-medium">
                  {n.label}
                </text>
                <text x={n.x + w / 2} y={n.y + H + 32} textAnchor="middle" className="fill-ink-3 font-mono text-[10px]">
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
