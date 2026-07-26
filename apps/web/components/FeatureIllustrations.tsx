import type { SVGProps } from "react";

type IllustProps = SVGProps<SVGSVGElement>;

function frame(props: IllustProps) {
  return {
    viewBox: "0 0 280 160",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    ...props,
  };
}

/** Keyboard-first navigation scene. */
export function KeyboardFirstIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      <rect
        x="24"
        y="28"
        width="232"
        height="104"
        rx="12"
        className="fill-[var(--opt-bg)] stroke-[var(--opt-border)]"
        strokeWidth="1.5"
      />
      {/* Key rows */}
      {[0, 1, 2].map((row) =>
        Array.from({ length: row === 2 ? 5 : 8 }).map((_, i) => {
          const keyW = 22;
          const gap = 6;
          const total = row === 2 ? 5 * keyW + 4 * gap : 8 * keyW + 7 * gap;
          const startX = (280 - total) / 2;
          const x = startX + i * (keyW + gap);
          const y = 44 + row * 30;
          const highlight = (row === 1 && (i === 3 || i === 4)) || (row === 2 && i === 2);
          return (
            <rect
              key={`${row}-${i}`}
              x={x}
              y={y}
              width={keyW}
              height={22}
              rx="4"
              className={
                highlight
                  ? "fill-[var(--opt-accent)] stroke-[var(--opt-border)]"
                  : "fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
              }
              strokeWidth="1.25"
            />
          );
        }),
      )}
      {/* Hands-off cue: cursor stays on keys */}
      <path
        d="M148 118c8 6 14 4 18-2"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="168" cy="114" r="3" className="fill-[var(--opt-text)]" opacity="0.45" />
    </svg>
  );
}

/** Clustered related changes vs a flat file list. */
export function ClusteredChangesIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      {/* Left: messy alphabetical stack */}
      <g opacity="0.45">
        {["a.ts", "b.ts", "c.cfg", "d.ts", "e.cfg"].map((label, i) => (
          <g key={label}>
            <rect
              x="28"
              y={28 + i * 22}
              width="88"
              height="18"
              rx="4"
              className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
              strokeWidth="1.25"
            />
            <text
              x="40"
              y={41 + i * 22}
              className="fill-[var(--opt-muted)]"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          </g>
        ))}
      </g>

      {/* Arrow */}
      <path
        d="M130 80h28m0 0-6-5m6 5-6 5"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right: two clusters */}
      <rect
        x="172"
        y="26"
        width="84"
        height="52"
        rx="8"
        className="fill-[var(--opt-bg)] stroke-[var(--opt-accent)]"
        strokeWidth="1.75"
      />
      <rect
        x="182"
        y="36"
        width="64"
        height="14"
        rx="3"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1"
      />
      <rect
        x="182"
        y="54"
        width="64"
        height="14"
        rx="3"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1"
      />
      <text
        x="186"
        y="46"
        className="fill-[var(--opt-text)]"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        c.cfg
      </text>
      <text
        x="186"
        y="64"
        className="fill-[var(--opt-text)]"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        e.cfg
      </text>

      <rect
        x="172"
        y="90"
        width="84"
        height="52"
        rx="8"
        className="fill-[var(--opt-bg)] stroke-[var(--opt-border)]"
        strokeWidth="1.5"
      />
      <rect
        x="182"
        y="100"
        width="64"
        height="14"
        rx="3"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1"
      />
      <rect
        x="182"
        y="118"
        width="64"
        height="14"
        rx="3"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1"
      />
      <text
        x="186"
        y="110"
        className="fill-[var(--opt-text)]"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        a.ts
      </text>
      <text
        x="186"
        y="128"
        className="fill-[var(--opt-text)]"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        d.ts
      </text>
    </svg>
  );
}

/** Optional AI summaries with a grain-of-salt cue. */
export function SummariesIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      <rect
        x="48"
        y="24"
        width="140"
        height="112"
        rx="8"
        className="fill-[var(--opt-bg)] stroke-[var(--opt-border)]"
        strokeWidth="1.5"
      />
      {/* Diff-ish lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x="60"
          y={40 + i * 14}
          width={i % 3 === 0 ? 100 : i % 2 === 0 ? 72 : 88}
          height="6"
          rx="2"
          className={
            i === 1 || i === 4
              ? "fill-[color-mix(in_srgb,var(--opt-ok)_35%,var(--opt-subtle))]"
              : "fill-[var(--opt-subtle)]"
          }
        />
      ))}
      {/* Summary card floating */}
      <rect
        x="150"
        y="48"
        width="100"
        height="72"
        rx="8"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-accent)]"
        strokeWidth="1.75"
      />
      <circle cx="168" cy="66" r="8" className="fill-[var(--opt-accent)]" />
      <path
        d="M165 66h6M168 63v6"
        className="stroke-[var(--opt-accent-on)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="182"
        y="60"
        width="52"
        height="5"
        rx="1.5"
        className="fill-[var(--opt-text)]"
        opacity="0.7"
      />
      <rect
        x="164"
        y="80"
        width="72"
        height="4"
        rx="1.5"
        className="fill-[var(--opt-muted)]"
        opacity="0.55"
      />
      <rect
        x="164"
        y="90"
        width="60"
        height="4"
        rx="1.5"
        className="fill-[var(--opt-muted)]"
        opacity="0.4"
      />
      <rect
        x="164"
        y="100"
        width="48"
        height="4"
        rx="1.5"
        className="fill-[var(--opt-muted)]"
        opacity="0.3"
      />
      {/* Optional / skip cue */}
      <path
        d="M236 36l8 8m0-8-8 8"
        className="stroke-[var(--opt-muted)]"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** Direct-to-API, no product backend. */
export function NoBackendIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      {/* Browser / extension host */}
      <rect
        x="36"
        y="40"
        width="96"
        height="80"
        rx="10"
        className="fill-[var(--opt-bg)] stroke-[var(--opt-border)]"
        strokeWidth="1.5"
      />
      <rect x="36" y="40" width="96" height="18" rx="10" className="fill-[var(--opt-subtle)]" />
      <circle cx="50" cy="49" r="3" className="fill-[var(--opt-border)]" />
      <circle cx="60" cy="49" r="3" className="fill-[var(--opt-border)]" />
      <circle cx="70" cy="49" r="3" className="fill-[var(--opt-border)]" />
      <rect x="52" y="72" width="64" height="28" rx="6" className="fill-[var(--opt-accent)]" />
      <text
        x="84"
        y="90"
        textAnchor="middle"
        className="fill-[var(--opt-accent-on)]"
        fontSize="9"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        extension
      </text>

      {/* Direct arrows to providers */}
      <path
        d="M140 70h28"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M140 90h28"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M162 70l6-4m-6 4 6 4"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M162 90l6-4m-6 4 6 4"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <rect
        x="180"
        y="54"
        width="64"
        height="28"
        rx="6"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1.25"
      />
      <text
        x="212"
        y="72"
        textAnchor="middle"
        className="fill-[var(--opt-text)]"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
      >
        LLM API
      </text>

      <rect
        x="180"
        y="92"
        width="64"
        height="28"
        rx="6"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1.25"
      />
      <text
        x="212"
        y="110"
        textAnchor="middle"
        className="fill-[var(--opt-text)]"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
      >
        GitHub
      </text>

      {/* Crossed-out our server */}
      <g opacity="0.55">
        <rect
          x="100"
          y="128"
          width="80"
          height="22"
          rx="4"
          className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
          strokeWidth="1.25"
          strokeDasharray="3 2"
        />
        <text
          x="140"
          y="143"
          textAnchor="middle"
          className="fill-[var(--opt-muted)]"
          fontSize="8"
          fontFamily="system-ui, sans-serif"
        >
          our servers
        </text>
        <path
          d="M108 132l64 14M172 132l-64 14"
          className="stroke-[var(--opt-error)]"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** BYO keys for already-approved tools + open source. */
export function ApprovedToolsIllustration(props: IllustProps) {
  return (
    <svg {...frame(props)}>
      {/* Shield */}
      <path
        d="M90 28 56 40v28c0 28 22 44 34 50 12-6 34-22 34-50V40L90 28Z"
        className="fill-[var(--opt-bg)] stroke-[var(--opt-border)]"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m76 68 10 10 18-20"
        className="stroke-[var(--opt-ok)]"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* API key chip */}
      <rect
        x="150"
        y="36"
        width="96"
        height="36"
        rx="8"
        className="fill-[var(--opt-subtle)] stroke-[var(--opt-border)]"
        strokeWidth="1.5"
      />
      <circle cx="168" cy="54" r="8" className="fill-[var(--opt-accent)]" />
      <path
        d="M172 54h18a4 4 0 0 1 0 8h-4"
        className="stroke-[var(--opt-text)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="194" cy="58" r="1.5" className="fill-[var(--opt-text)]" />
      <circle cx="200" cy="58" r="1.5" className="fill-[var(--opt-text)]" />

      {/* Provider labels */}
      {["OpenAI", "Anthropic", "xAI"].map((label, i) => (
        <g key={label}>
          <rect
            x={150 + (i === 2 ? 24 : 0)}
            y={88 + i * 22}
            width={i === 2 ? 48 : 72}
            height="18"
            rx="9"
            className="fill-[var(--opt-bg)] stroke-[var(--opt-border)]"
            strokeWidth="1.25"
          />
          <text
            x={150 + (i === 2 ? 48 : 36)}
            y={100 + i * 22}
            textAnchor="middle"
            className="fill-[var(--opt-text)]"
            fontSize="8"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Open source badge */}
      <rect x="48" y="118" width="84" height="22" rx="11" className="fill-[var(--opt-accent)]" />
      <text
        x="90"
        y="133"
        textAnchor="middle"
        className="fill-[var(--opt-accent-on)]"
        fontSize="9"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        open source
      </text>
    </svg>
  );
}
