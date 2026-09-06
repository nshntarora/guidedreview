import { describe, expect, it } from "vitest";
import type { DiffFile, DiffHunk } from "@guided-review/ui/review/types";
import {
  imageSidesForStatus,
  looksLikeSvg,
  reconstructedImageSrcs,
  reconstructSides,
  svgDataUrl,
} from "./imagePreview";

const SVG_OLD =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>';
const SVG_NEW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="blue"/></svg>';

function file(overrides: Partial<DiffFile> & { hunks: DiffHunk[] }): DiffFile {
  return {
    path: "icon.svg",
    status: "modified",
    isBinaryOrElided: false,
    ...overrides,
  };
}

describe("reconstructSides", () => {
  it("joins added lines for a new SVG", () => {
    const result = reconstructSides(
      file({
        status: "added",
        hunks: [
          {
            id: "icon.svg#0",
            header: "@@ -0,0 +1,1 @@",
            oldStart: 0,
            oldLines: 0,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: SVG_NEW, newLine: 1 }],
          },
        ],
      }),
    );
    expect(result.oldText).toBeNull();
    expect(result.newText).toBe(SVG_NEW);
  });

  it("rebuilds both sides of a modified SVG from context/add/del", () => {
    const result = reconstructSides(
      file({
        hunks: [
          {
            id: "icon.svg#0",
            header: "@@ -1,1 +1,1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [
              { type: "del", content: SVG_OLD, oldLine: 1 },
              { type: "add", content: SVG_NEW, newLine: 1 },
            ],
          },
        ],
      }),
    );
    expect(result.oldText).toBe(SVG_OLD);
    expect(result.newText).toBe(SVG_NEW);
  });
});

describe("reconstructedImageSrcs", () => {
  it("returns data URLs for SVG hunks and nothing for PNG", () => {
    const svg = reconstructedImageSrcs(
      file({
        status: "added",
        hunks: [
          {
            id: "icon.svg#0",
            header: "@@ -0,0 +1,1 @@",
            oldStart: 0,
            oldLines: 0,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: SVG_NEW, newLine: 1 }],
          },
        ],
      }),
    );
    expect(svg.oldSrc).toBeNull();
    expect(svg.newSrc).toBe(svgDataUrl(SVG_NEW));
    expect(looksLikeSvg(SVG_NEW)).toBe(true);

    const png = reconstructedImageSrcs({
      path: "logo.png",
      status: "modified",
      isBinaryOrElided: true,
      hunks: [],
    });
    expect(png).toEqual({ oldSrc: null, newSrc: null });
  });

  it("skips a partial SVG hunk that has no root element", () => {
    const srcs = reconstructedImageSrcs(
      file({
        hunks: [
          {
            id: "icon.svg#0",
            header: "@@ -3,1 +3,1 @@",
            oldStart: 3,
            oldLines: 1,
            newStart: 3,
            newLines: 1,
            lines: [
              { type: "del", content: '  fill="red"', oldLine: 3 },
              { type: "add", content: '  fill="blue"', newLine: 3 },
            ],
          },
        ],
      }),
    );
    expect(srcs.oldSrc).toBeNull();
    expect(srcs.newSrc).toBeNull();
  });
});

describe("imageSidesForStatus", () => {
  it("shows only the new side for added files and only the old side for removals", () => {
    expect(imageSidesForStatus("added")).toEqual({ showOld: false, showNew: true });
    expect(imageSidesForStatus("removed")).toEqual({ showOld: true, showNew: false });
    expect(imageSidesForStatus("modified")).toEqual({ showOld: true, showNew: true });
    expect(imageSidesForStatus("renamed")).toEqual({ showOld: true, showNew: true });
  });
});
