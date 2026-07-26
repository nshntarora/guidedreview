import type { ReactNode, SVGProps } from "react";

type IllustProps = SVGProps<SVGSVGElement>;

/**
 * Feature illustrations.
 *
 * All five share one canvas, one set of primitives, and one palette so the
 * section reads as a single system rather than five unrelated drawings. The
 * vocabulary is deliberately the product's own — review-unit rows, kbd chips,
 * provider fields, window chrome — drawn in the site's mono/lime/warm-black
 * language. Lime is the only decorative hue; green and red appear solely where
 * they carry diff meaning (added / removed lines).
 */

const VIEW_W = 320;
const VIEW_H = 200;

function frame(props: IllustProps) {
  return {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    ...props,
  };
}

/* ------------------------------------------------------------------ *
 * Shared surface + type primitives
 * ------------------------------------------------------------------ */

/** Raised panel — one step above the card background. */
const SURFACE = "fill-[var(--opt-subtle)] stroke-[var(--opt-border)]";
/** Recessed control (input, key cap, pill) sitting inside a surface. */
const INSET = "fill-[var(--opt-bg)] stroke-[var(--opt-border)]";
/** Selected / active state — the single accent moment per illustration. */
const ACCENT_WASH =
  "fill-[color-mix(in_srgb,var(--opt-accent)_14%,transparent)] stroke-[var(--gr-accent-ink)]";

const ADD_WASH = "fill-[color-mix(in_srgb,var(--opt-ok)_20%,transparent)]";
const DEL_WASH = "fill-[color-mix(in_srgb,var(--opt-error)_16%,transparent)]";

type PanelProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  className?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
};

function Panel({
  x,
  y,
  w,
  h,
  r = 10,
  className = SURFACE,
  strokeWidth = 1.25,
  strokeDasharray,
}: PanelProps) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      className={className}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}

type TxtProps = {
  x: number;
  y: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  className?: string;
  weight?: number;
  children: ReactNode;
};

/** All type in these scenes is mono — it is a code product. */
function Txt({
  x,
  y,
  size = 8,
  anchor = "start",
  className = "fill-[var(--opt-muted)]",
  weight,
  children,
}: TxtProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      fontWeight={weight}
      className={`font-mono ${className}`}
    >
      {children}
    </text>
  );
}

/** Small caps section label, e.g. "review units". */
function SectionLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontSize="7"
      letterSpacing="0.08em"
      className="font-mono fill-[var(--opt-muted)] uppercase"
    >
      {children}
    </text>
  );
}

/** Keyboard chip, matching the `Kbd` chips used in the site nav and product. */
function KeyCap({
  x,
  y,
  w = 18,
  label,
  accent = false,
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={18}
        rx={4}
        className={accent ? ACCENT_WASH : INSET}
        strokeWidth={1.25}
      />
      <Txt
        x={x + w / 2}
        y={y + 12.5}
        size={8.5}
        anchor="middle"
        className={accent ? "fill-[var(--gr-accent-ink)]" : "fill-[var(--opt-text)]"}
      >
        {label}
      </Txt>
    </g>
  );
}

/** Rounded bar standing in for a line of code / prose. */
function Bar({
  x,
  y,
  w,
  h = 6,
  className = "fill-[var(--opt-muted)]",
  opacity = 0.5,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  className?: string;
  opacity?: number;
}) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={h / 2} className={className} opacity={opacity} />
  );
}

/** Four-point spark — the one "AI happened here" mark, shared across scenes. */
function Spark({ x, y, scale = 0.5 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <path
        d="M12 2c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z"
        className="fill-[var(--gr-accent-ink)]"
      />
      <path
        d="M19 15c.3 1.6 1.1 2.4 2.7 2.7-1.6.3-2.4 1.1-2.7 2.7-.3-1.6-1.1-2.4-2.7-2.7 1.6-.3 2.4-1.1 2.7-2.7Z"
        className="fill-[var(--gr-accent-ink)]"
        opacity="0.7"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * 1 — Review changes, not files
 * A flat alphabetical file list becomes the product's numbered, *titled*
 * review-unit sidebar. The point is the titles, not the grouping boxes.
 * ------------------------------------------------------------------ */

const FLAT_FILES = ["a11y.tsx", "api.ts", "auth.ts", "db.sql", "form.tsx", "seed.ts"];

const REVIEW_UNITS = [
  { title: "1  Schema", files: "db.sql · seed.ts" },
  { title: "2  Auth path", files: "auth.ts · api.ts" },
  { title: "3  Form + a11y", files: "form.tsx · a11y.tsx" },
];

export function ClusteredChangesIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      <SectionLabel x={8} y={20}>
        changed files
      </SectionLabel>
      <Txt x={120} y={20} size={7} anchor="end" className="fill-[var(--opt-muted)]">
        a→z
      </Txt>

      {/* Left: the flat diff you get today. */}
      <g opacity="0.55">
        <Panel x={8} y={30} w={112} h={162} />
        {FLAT_FILES.map((file, i) => {
          const y = 40 + i * 24;
          return (
            <g key={file}>
              <Panel x={18} y={y} w={92} h={18} r={4} className={INSET} strokeWidth={1} />
              <Txt x={26} y={y + 12.5} size={7.5}>
                {file}
              </Txt>
            </g>
          );
        })}
      </g>

      {/* The clustering step. */}
      <Spark x={143} y={86} scale={0.62} />
      <path
        d="M128 111h44m-6-5 6 5-6 5"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right: the review plan. */}
      <SectionLabel x={184} y={20}>
        review units
      </SectionLabel>
      <Panel x={184} y={30} w={128} h={162} />
      {REVIEW_UNITS.map((unit, i) => {
        const y = 42 + i * 46;
        const active = i === 0;
        return (
          <g key={unit.title}>
            <Panel
              x={194}
              y={y}
              w={108}
              h={40}
              r={6}
              className={active ? ACCENT_WASH : INSET}
              strokeWidth={active ? 1.5 : 1}
            />
            <Txt
              x={204}
              y={y + 17}
              size={9}
              weight={600}
              className={active ? "fill-[var(--gr-accent-ink)]" : "fill-[var(--opt-text)]"}
            >
              {unit.title}
            </Txt>
            <Txt x={204} y={y + 30} size={7}>
              {unit.files}
            </Txt>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * 2 — Keyboard first
 * Not a keyboard. The actual keymap, floating over the code it drives —
 * which is what "you never lift your hands" looks like in practice.
 * ------------------------------------------------------------------ */

/** [left indent, right inset] — lines run edge to edge so the keymap card
 *  reads as floating *over* a page of code rather than beside it. */
const CODE_TEXTURE = [
  [0, 40],
  [12, 8],
  [12, 72],
  [24, 20],
  [24, 96],
  [12, 4],
  [0, 56],
  [12, 88],
  [24, 12],
  [24, 64],
  [12, 32],
  [0, 100],
  [12, 16],
] as const;

const KEYMAP: { action: string; keys: string[]; accent?: boolean }[] = [
  { action: "next / prev unit", keys: ["←", "→"] },
  { action: "scroll the diff", keys: ["j", "k"] },
  { action: "comment on a line", keys: ["c"] },
  { action: "submit review", keys: ["⌘", "↵"], accent: true },
];

const KEY_W = 18;
const KEY_GAP = 5;
const KEYS_RIGHT = 272;

export function KeyboardFirstIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      {/* Code underneath — you are still reading code, the keys just move you. */}
      <g opacity="0.22">
        {CODE_TEXTURE.map(([indent, inset], i) => (
          <Bar key={i} x={indent} y={10 + i * 15} w={VIEW_W - indent - inset} opacity={1} />
        ))}
      </g>

      <Panel x={32} y={18} w={256} h={164} />
      <SectionLabel x={48} y={38}>
        keymap
      </SectionLabel>
      <rect x={82} y={31} width={4} height={9} className="fill-[var(--gr-accent-ink)]" />

      {KEYMAP.map((row, i) => {
        const y = 50 + i * 33;
        const total = row.keys.length * KEY_W + (row.keys.length - 1) * KEY_GAP;
        const startX = KEYS_RIGHT - total;
        return (
          <g key={row.action}>
            <Txt x={48} y={y + 13} size={9} className="fill-[var(--opt-text)]">
              {row.action}
            </Txt>
            {row.keys.map((key, k) => (
              <KeyCap
                key={key}
                x={startX + k * (KEY_W + KEY_GAP)}
                y={y}
                label={key}
                accent={row.accent}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * 3 — Summaries (because AI)
 * Two lines pinned above the diff, with a visible dismiss — the copy's
 * "sometimes it's not [helpful]" made literal.
 * ------------------------------------------------------------------ */

const DIFF_LINES: { w: number; kind: "same" | "add" | "del" }[] = [
  { w: 212, kind: "same" },
  { w: 164, kind: "add" },
  { w: 192, kind: "same" },
  { w: 136, kind: "del" },
  { w: 180, kind: "add" },
];

export function SummariesIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      {/* One review unit: the summary sits at the top of the pane, above the
          code — exactly where the product puts it, and closeable. */}
      <Panel x={8} y={14} w={304} h={174} />

      <Panel
        x={20}
        y={26}
        w={280}
        h={62}
        r={8}
        className="fill-[var(--opt-bg)] stroke-[var(--gr-accent-ink)]"
        strokeWidth={1.5}
      />
      <Spark x={30} y={32} scale={0.6} />
      <Txt x={52} y={45} size={8} weight={600} className="fill-[var(--gr-accent-ink)]">
        summary
      </Txt>
      <path
        d="M278 35l8 8m0-8-8 8"
        className="stroke-[var(--opt-muted)]"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <Bar x={32} y={58} w={252} opacity={0.5} />
      <Bar x={32} y={72} w={190} opacity={0.32} />

      <path d="M20 102h280" className="stroke-[var(--opt-border)]" strokeWidth="1" />

      {DIFF_LINES.map((line, i) => {
        const y = 112 + i * 15;
        const changed = line.kind !== "same";
        return (
          <g key={i}>
            {changed && (
              <rect
                x={16}
                y={y - 4}
                width={288}
                height={14}
                rx={3}
                className={line.kind === "add" ? ADD_WASH : DEL_WASH}
              />
            )}
            {changed && (
              <Txt
                x={22}
                y={y + 6}
                size={8}
                className={line.kind === "add" ? "fill-[var(--opt-ok)]" : "fill-[var(--opt-error)]"}
              >
                {line.kind === "add" ? "+" : "−"}
              </Txt>
            )}
            <Bar
              x={34}
              y={y}
              w={line.w}
              className={
                line.kind === "add"
                  ? "fill-[var(--opt-ok)]"
                  : line.kind === "del"
                    ? "fill-[var(--opt-error)]"
                    : "fill-[var(--opt-muted)]"
              }
              opacity={changed ? 0.6 : 0.4}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * 4 — Tools corporate security has already approved
 * The real provider-config row: pick an approved provider, paste a key,
 * the key stays local. No shield, no padlock, no stock-security metaphor.
 * ------------------------------------------------------------------ */

const PROVIDER_CHIPS: { label: string; w: number }[] = [
  { label: "OpenAI", w: 56 },
  { label: "Anthropic", w: 72 },
  { label: "Grok", w: 46 },
];

export function ApprovedToolsIllustration(props: IllustProps) {
  const chipGap = 8;
  const chipsTotal =
    PROVIDER_CHIPS.reduce((sum, c) => sum + c.w, 0) + chipGap * (PROVIDER_CHIPS.length - 1);
  let chipX = (VIEW_W - chipsTotal) / 2;

  return (
    <svg {...frame(props)}>
      <Panel x={14} y={18} w={292} h={98} />
      <SectionLabel x={30} y={38}>
        ai provider
      </SectionLabel>

      {/* Provider select */}
      <Panel x={30} y={46} w={140} h={28} r={6} className={INSET} />
      <Txt x={42} y={64} size={9} className="fill-[var(--opt-text)]">
        Anthropic
      </Txt>
      <path
        d="M152 58l4 4 4-4"
        className="stroke-[var(--opt-muted)]"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* API key field */}
      <Panel x={180} y={46} w={110} h={28} r={6} className={INSET} />
      <Txt x={190} y={64} size={8.5}>
        sk-ant-••••••
      </Txt>

      {/* Local-only status */}
      <circle cx={34} cy={94} r={3.5} className="fill-[var(--gr-accent-ink)]" />
      <Txt x={44} y={97} size={7.5}>
        connected · key stays on your machine
      </Txt>

      {/* Providers your org has probably already signed off on */}
      {PROVIDER_CHIPS.map((chip) => {
        const x = chipX;
        chipX += chip.w + chipGap;
        return (
          <g key={chip.label}>
            <Panel x={x} y={132} w={chip.w} h={22} r={11} className={INSET} />
            <Txt
              x={x + chip.w / 2}
              y={146}
              size={8}
              anchor="middle"
              className="fill-[var(--opt-text)]"
            >
              {chip.label}
            </Txt>
          </g>
        );
      })}

      {/* …and you can read every line of what it does. */}
      <rect x={98} y={166} width={124} height={24} rx={12} className="fill-[var(--opt-accent)]" />
      <Txt
        x={160}
        y={182}
        size={9}
        weight={600}
        anchor="middle"
        className="fill-[var(--opt-accent-on)]"
      >
        open source
      </Txt>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * 5 — No backend
 * Two direct paths out of your browser, and a server-shaped hole where a
 * middleman would be. The break in the path does the work — no red X.
 * ------------------------------------------------------------------ */

export function NoBackendIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      <Txt x={160} y={28} size={7.5} anchor="middle">
        your browser
      </Txt>

      {/* Endpoints you already trust */}
      <Panel x={8} y={64} w={68} h={28} r={8} className={INSET} />
      <Txt x={42} y={82} size={8.5} anchor="middle" className="fill-[var(--opt-text)]">
        GitHub
      </Txt>

      <Panel x={244} y={64} w={68} h={28} r={8} className={INSET} />
      <Txt x={278} y={82} size={8.5} anchor="middle" className="fill-[var(--opt-text)]">
        LLM API
      </Txt>

      {/* Direct, two-way */}
      <path
        d="M80 78h24m-24 0 4-4m-4 4 4 4m20-4-4-4m4 4-4 4"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M216 78h24m-24 0 4-4m-4 4 4 4m20-4-4-4m4 4-4 4"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The browser window itself */}
      <rect x={112} y={40} width={96} height={76} rx={10} className="fill-[var(--opt-bg)]" />
      <path
        d="M112 50a10 10 0 0 1 10-10h76a10 10 0 0 1 10 10v10h-96V50Z"
        className="fill-[var(--opt-subtle)]"
      />
      <circle cx={124} cy={50} r={2.5} className="fill-[var(--opt-border)]" />
      <circle cx={132} cy={50} r={2.5} className="fill-[var(--opt-border)]" />
      <circle cx={140} cy={50} r={2.5} className="fill-[var(--opt-border)]" />
      <rect x={126} y={74} width={68} height={24} rx={6} className="fill-[var(--opt-accent)]" />
      <Txt
        x={160}
        y={90}
        size={8.5}
        weight={600}
        anchor="middle"
        className="fill-[var(--opt-accent-on)]"
      >
        extension
      </Txt>
      <Panel
        x={112}
        y={40}
        w={96}
        h={76}
        className="fill-none stroke-[var(--gr-accent-ink)]"
        strokeWidth={1.75}
      />

      {/* …and the path that does not exist */}
      <path
        d="M160 116v16"
        className="stroke-[var(--opt-muted)]"
        strokeWidth="1.4"
        strokeDasharray="3 3"
        opacity="0.6"
      />
      <path
        d="M156 136l8 8m0-8-8 8"
        className="stroke-[var(--opt-muted)]"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <g opacity="0.55">
        <Panel
          x={110}
          y={152}
          w={100}
          h={30}
          r={8}
          className="fill-none stroke-[var(--opt-border)]"
          strokeDasharray="4 3"
        />
        <Txt x={160} y={171} size={8} anchor="middle">
          our servers
        </Txt>
      </g>
    </svg>
  );
}
