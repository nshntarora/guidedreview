/**
 * Serves a compact Markdown representation of HTML pages to clients that
 * explicitly negotiate for it. This runs before Pages serves the static Next
 * export, so browser requests continue to receive the original HTML.
 */

type Assets = { fetch(request: Request): Promise<Response> };
type Context = { request: Request; env: { ASSETS: Assets } };

function acceptsMarkdown(accept: string | null) {
  if (!accept) return false;

  return accept.split(",").some((entry) => {
    const [mediaType, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const qualityText = quality?.trim().slice(2) ?? "1";
    const validQuality = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(qualityText);

    return mediaType.trim() === "text/markdown" && validQuality && Number(qualityText) > 0;
  });
}

function appendVary(headers: Headers, value: string) {
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.some((item) => item === "*" || item.toLowerCase() === value.toLowerCase())) {
    values.push(value);
  }
  headers.set("Vary", values.join(", "));
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_match, hex, decimal) => {
      const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      return codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : _match;
    })
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'");
}

function metadata(html: string, name: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (attribute(tag, "name").toLowerCase() === name) {
      return decodeHtml(attribute(tag, "content"));
    }
  }
  return "";
}

function markdownFromHtml(html: string) {
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = metadata(html, "description");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;

  // Protect code before stripping tags or normalizing whitespace. In particular,
  // escaped HTML in code examples must remain literal, and pre/code must not
  // become nested Markdown backticks.
  const codeBlocks: string[] = [];
  const body = main
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|svg|noscript|template|nav|aside|footer|button)\b[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_tag, content: string) => {
      const language = content.match(/\bclass=["'][^"']*language-([\w-]+)/i)?.[1] ?? "";
      const code = decodeHtml(content.replace(/<[^>]+>/g, "")).replace(/\n$/, "");
      const fence = "`".repeat(
        Math.max(3, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length + 1)),
      );
      const index = codeBlocks.push(`${fence}${language}\n${code}\n${fence}`) - 1;
      return `\n\n\uE000CODE${index}\uE001\n\n`;
    })
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_tag, content: string) => {
      const code = decodeHtml(content.replace(/<[^>]+>/g, ""));
      const fence = "`".repeat(
        Math.max(1, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length + 1)),
      );
      const padding = code.startsWith("`") || code.endsWith("`") ? " " : "";
      const index = codeBlocks.push(`${fence}${padding}${code}${padding}${fence}`) - 1;
      return `\uE000CODE${index}\uE001`;
    })
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const alt = attribute(tag, "alt").trim();
      return alt ? `\n\n${alt}\n\n` : "";
    })
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (tag, text) => {
      const href = attribute(tag, "href").trim();
      const label = text.replace(/<[^>]+>/g, "").trim();
      return href && label ? `[${label}](${href})` : label;
    })
    .replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_tag, content: string) => {
      const rows = Array.from(content.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (row) =>
        Array.from(row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi), (cell) =>
          cell[1]
            .replace(/<[^>]+>/g, "")
            .replace(/\|/g, "\\|")
            .trim(),
        ),
      );
      if (!rows.length) return "";
      const lines = rows.map((row) => `| ${row.join(" | ")} |`);
      lines.splice(1, 0, `| ${rows[0].map(() => "---").join(" | ")} |`);
      return `\n\n${lines.join("\n")}\n\n`;
    })
    .replace(
      /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
      (_tag, level, text) => `\n\n${"#".repeat(Number(level))} ${text}\n\n`,
    )
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(
      /<\/?(?:p|div|section|article|figure|figcaption|blockquote|ul|ol|table|thead|tbody|tr|br)\b[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, "");

  const frontmatter = [
    title && `title: ${JSON.stringify(title)}`,
    description && `description: ${JSON.stringify(description)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const cleaned = decodeHtml(body)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(/\uE000CODE(\d+)\uE001/g, (_match, index) => codeBlocks[Number(index)]);

  return `${frontmatter ? `---\n${frontmatter}\n---\n\n` : ""}${cleaned}\n`;
}

function withVary(response: Response) {
  const headers = new Headers(response.headers);
  appendVary(headers, "Accept");
  return new Response(response.body, { status: response.status, headers });
}

export async function onRequest({ request, env }: Context): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  const isHtml = response.headers.get("Content-Type")?.toLowerCase().startsWith("text/html");

  // Static assets have no Markdown equivalent, so do not fragment their cache.
  if (!isHtml) return response;

  if (
    response.status !== 200 ||
    (request.method !== "GET" && request.method !== "HEAD") ||
    !acceptsMarkdown(request.headers.get("Accept"))
  ) {
    return withVary(response);
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.delete("Content-Range");
  headers.delete("Transfer-Encoding");
  appendVary(headers, "Accept");

  return new Response(request.method === "HEAD" ? null : markdownFromHtml(await response.text()), {
    status: response.status,
    headers,
  });
}
