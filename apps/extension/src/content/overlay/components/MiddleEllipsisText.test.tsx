import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiddleEllipsisText } from "./MiddleEllipsisText";

describe("MiddleEllipsisText", () => {
  it("renders the full text when width cannot be measured", () => {
    // jsdom typically reports clientWidth 0, so the component falls back to full text.
    render(<MiddleEllipsisText text="src/very/long/path/to/file.ts" maxWidth="100%" />);

    expect(screen.getByTitle("src/very/long/path/to/file.ts")).toHaveTextContent(
      "src/very/long/path/to/file.ts",
    );
  });

  it("exposes the full path via title for tooltips", () => {
    render(<MiddleEllipsisText text="apps/extension/src/lib/types.ts" maxWidth={120} />);

    expect(screen.getByTitle("apps/extension/src/lib/types.ts")).toBeInTheDocument();
  });

  it("applies maxWidth as a CSS style", () => {
    render(<MiddleEllipsisText text="a/b.ts" maxWidth={80} />);

    expect(screen.getByTitle("a/b.ts")).toHaveStyle({ maxWidth: "80px" });
  });
});
