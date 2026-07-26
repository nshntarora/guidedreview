import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Guided Review — a better way to review AI generated code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#caff57";
const BG = "#0d0806";
const TEXT = "#fefefe";
const MUTED = "#fefefea1";

export default async function OpengraphImage() {
  const logoPath = path.join(process.cwd(), "../../packages/ui/src/assets/logomark.png");
  const logoData = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "96px",
        background: BG,
        color: TEXT,
        fontFamily: "sans-serif",
      }}
    >
      {/* next/og's ImageResponse renders via satori, which requires <img>, not next/image. */}
      <img src={logoSrc} width={172.5} height={88} alt="" style={{ borderRadius: 0 }} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          marginTop: 48,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: 900,
        }}
      >
        <span>A better way for humans to review&nbsp;</span>
        <span style={{ color: ACCENT }}>AI generated code</span>
      </div>
      <div style={{ marginTop: 32, fontSize: 30, color: MUTED, maxWidth: 820 }}>
        Free · Open source · Bring your own LLM key
      </div>
    </div>,
    { ...size },
  );
}
