import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_URL } from "@web/lib/site";

export const dynamic = "force-static";

/** These source pages use Markdown plus navigation/install components. */
export async function GET() {
  const slugs = ["install", "how-it-works", "privacy-and-data", "faq"];
  const sections = await Promise.all(
    slugs.map(async (slug) => {
      const source = await readFile(
        path.join(process.cwd(), "content/help", `${slug}.mdx`),
        "utf8",
      );
      const markdown = source
        .slice(source.indexOf("\n# ") + 1)
        .replace(/<JsonLd[\s\S]*?\/>/g, "")
        .replace(/<TocCard[^>]*\/>/g, "")
        .replace(
          /<InstallAppCards\s*\/>/g,
          `[Chrome extension](${SITE_URL}/docs/chrome-extension) · [CLI](${SITE_URL}/docs/cli)`,
        )
        .replace(
          /<a href=\{CHROME_WEB_STORE_URL\}>Chrome Web Store<\/a>/g,
          `[Chrome Web Store](${SITE_URL}/docs/chrome-extension)`,
        )
        .replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`);
      return `Source: ${SITE_URL}/docs/${slug}\n\n${markdown.trim()}`;
    }),
  );
  const index = await readFile(path.join(process.cwd(), "public/llms.txt"), "utf8");
  return new Response([index.trim(), ...sections].join("\n\n---\n\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
