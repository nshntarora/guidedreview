import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}

export function DiffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9 3v12" />
      <path d="M9 15h6a3 3 0 0 0 3-3V9" />
      <path d="m6 6 3-3 3 3" />
      <path d="m15 12 3-3 3 3" />
    </svg>
  );
}

export function PlugIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v3a6 6 0 0 1-12 0V8Z" />
    </svg>
  );
}

export function CheckShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function KeyboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </svg>
  );
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ ...props, fill: "currentColor", stroke: "none" })}>
      <path d="M12 2c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" />
      <path d="M19 15c.3 1.6 1.1 2.4 2.7 2.7-1.6.3-2.4 1.1-2.7 2.7-.3-1.6-1.1-2.4-2.7-2.7 1.6-.3 2.4-1.1 2.7-2.7Z" />
    </svg>
  );
}

export function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ ...props, fill: "currentColor", stroke: "none" })}>
      <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.525.097.717-.228.717-.507 0-.25-.009-.913-.014-1.793-2.917.634-3.533-1.406-3.533-1.406-.477-1.213-1.165-1.536-1.165-1.536-.952-.65.072-.637.072-.637 1.053.074 1.607 1.081 1.607 1.081.936 1.604 2.457 1.14 3.056.872.095-.678.366-1.14.666-1.402-2.329-.265-4.777-1.165-4.777-5.187 0-1.146.41-2.083 1.08-2.817-.108-.266-.469-1.334.103-2.78 0 0 .881-.282 2.887 1.076a10.03 10.03 0 0 1 5.253 0c2.005-1.358 2.885-1.076 2.885-1.076.573 1.446.213 2.514.104 2.78.672.734 1.079 1.671 1.079 2.817 0 4.032-2.452 4.919-4.788 5.179.376.324.712.964.712 1.943 0 1.403-.013 2.534-.013 2.879 0 .281.19.609.723.505A10.5 10.5 0 0 0 12 1.5Z" />
    </svg>
  );
}
