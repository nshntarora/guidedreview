import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ParsedDiff, PRContext } from "@extension/lib/types";
import { DescriptionPane } from "./DescriptionPane";

function prContext(overrides: Partial<PRContext> = {}): PRContext {
  return {
    owner: "acme",
    repo: "widgets",
    number: 1,
    url: "https://github.com/acme/widgets/pull/1",
    title: "Add feature",
    description: "This PR adds a feature.",
    descriptionHtml: "<p>This PR adds a feature.</p>",
    author: "octocat",
    baseRef: "main",
    headRef: "feature",
    ...overrides,
  };
}

function diffFixture(): ParsedDiff {
  return {
    files: [
      {
        path: "src/new.ts",
        status: "added",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/new.ts#0",
            header: "@@ -0,0 +1,2 @@",
            oldStart: 0,
            oldLines: 0,
            newStart: 1,
            newLines: 2,
            lines: [
              { type: "add", content: "a", newLine: 1 },
              { type: "add", content: "b", newLine: 2 },
            ],
          },
        ],
      },
      {
        path: "src/foo.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/foo.ts#0",
            header: "@@ -1,1 +1,1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [
              { type: "del", content: "old", oldLine: 1 },
              { type: "add", content: "new", newLine: 1 },
            ],
          },
        ],
      },
      {
        path: "src/gone.ts",
        status: "removed",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/gone.ts#0",
            header: "@@ -1,1 +0,0 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 0,
            newLines: 0,
            lines: [{ type: "del", content: "bye", oldLine: 1 }],
          },
        ],
      },
      {
        path: "src/renamed.ts",
        previousPath: "src/old-name.ts",
        status: "renamed",
        isBinaryOrElided: false,
        hunks: [],
      },
      {
        path: "assets/logo.png",
        status: "modified",
        isBinaryOrElided: true,
        hunks: [],
      },
    ],
  };
}

describe("DescriptionPane", () => {
  it("renders the PR description without a diff summary when diff is null", () => {
    render(<DescriptionPane prContext={prContext()} diff={null} />);
    expect(screen.getByText("PR Description")).toBeInTheDocument();
    expect(screen.getByText("This PR adds a feature.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/diff summary/i)).not.toBeInTheDocument();
  });

  it("shows totals and file statuses when a diff is present", () => {
    render(<DescriptionPane prContext={prContext()} diff={diffFixture()} />);

    const summary = screen.getByLabelText(/diff summary/i);
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).toMatch(/\+3/);
    expect(summary.textContent).toMatch(/−2/);
    expect(summary.textContent).toMatch(/5 files/);

    expect(screen.getByText("src/new.ts")).toBeInTheDocument();
    expect(screen.getByText("src/foo.ts")).toBeInTheDocument();
    expect(screen.getByText("src/gone.ts")).toBeInTheDocument();
    expect(screen.getByText("src/old-name.ts → src/renamed.ts")).toBeInTheDocument();
    expect(screen.getByText("assets/logo.png")).toBeInTheDocument();
    expect(screen.getByText("binary")).toBeInTheDocument();

    expect(screen.getByLabelText("added")).toBeInTheDocument();
    expect(screen.getAllByLabelText("modified").length).toBe(2);
    expect(screen.getByLabelText("deleted")).toBeInTheDocument();
    expect(screen.getByLabelText("renamed")).toBeInTheDocument();
  });

  it("omits the summary when the diff has no files", () => {
    render(<DescriptionPane prContext={prContext()} diff={{ files: [] }} />);
    expect(screen.queryByLabelText(/diff summary/i)).not.toBeInTheDocument();
  });
});
