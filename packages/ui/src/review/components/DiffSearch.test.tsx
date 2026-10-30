import { useRef } from "react";
import { expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ParsedDiff } from "@guided-review/ui/review/types";
import { Button } from "@guided-review/ui";
import { CommandPaletteProvider, useCommandPalette } from "@guided-review/ui/review/commandPalette";
import { CommandPalette } from "./CommandPalette";
import { DiffSearch } from "./DiffSearch";

function sampleDiff(): ParsedDiff {
  return {
    files: [
      {
        path: "src/auth/login.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/auth/login.ts#0",
            header: "@@ -1,3 +1,4 @@",
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 4,
            lines: [
              {
                type: "context",
                content: "import { User } from './types';",
                oldLine: 1,
                newLine: 1,
              },
              { type: "context", content: "", oldLine: 2, newLine: 2 },
              { type: "add", content: "export function authenticate() {}", newLine: 3 },
              { type: "context", content: "export function logout() {}", oldLine: 3, newLine: 4 },
            ],
          },
        ],
      },
      {
        path: "src/utils/format.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/utils/format.ts#0",
            header: "@@ -1 +1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: "return loginName;", newLine: 1 }],
          },
        ],
      },
    ],
  };
}

function Layout({
  children,
  keyActionRef = { current: null },
}: {
  children?: React.ReactNode;
  keyActionRef?: { current: ((event: KeyboardEvent) => boolean) | null };
}) {
  const open = useCommandPalette((state) => state.open);
  const dialogRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <Button data-testid="open-actions" onClick={() => open()}>
        Actions
      </Button>
      <Button data-testid="open-search" onClick={() => open("search")}>
        Search
      </Button>
      {children}
      <CommandPalette dialogRef={dialogRef} keyActionRef={keyActionRef} />
    </>
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

it("opens registered search from actions, keeps fuzzy matches and previews, and selects a real diff line", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(
    <CommandPaletteProvider>
      <Layout>
        <DiffSearch diff={sampleDiff()} onSelect={onSelect} />
      </Layout>
    </CommandPaletteProvider>,
  );
  await user.click(screen.getByTestId("open-actions"));
  await user.type(screen.getByTestId("command-palette-input"), "serch");
  await user.keyboard("{Enter}");
  const input = screen.getByTestId("diff-search-input");
  await user.type(input, "authentcate");
  expect(screen.getByTestId("diff-search-line-preview")).toHaveTextContent(
    "export function logout",
  );
  expect(screen.getAllByTestId("diff-search-match-mark").length).toBeGreaterThan(0);
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "line",
      filePath: "src/auth/login.ts",
      content: "export function authenticate() {}",
    }),
  );
  expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  expect(screen.getByTestId("open-actions")).toHaveFocus();
});

it("routes capture keys, supports back navigation, and restores focus after dismissal", async () => {
  const user = userEvent.setup();
  const keyActionRef = { current: null as ((event: KeyboardEvent) => boolean) | null };
  render(
    <CommandPaletteProvider>
      <Layout keyActionRef={keyActionRef}>
        <DiffSearch diff={sampleDiff()} onSelect={vi.fn()} />
      </Layout>
    </CommandPaletteProvider>,
  );
  await user.click(screen.getByTestId("open-search"));
  const input = screen.getByTestId("diff-search-input");
  await waitFor(() => expect(input).toHaveFocus());
  fireEvent.change(input, { target: { value: "login" } });
  act(() => {
    keyActionRef.current!(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  });
  expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  await user.clear(input);
  act(() => {
    keyActionRef.current!(new KeyboardEvent("keydown", { key: "Backspace" }));
  });
  expect(screen.getByTestId("command-action-search")).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByTestId("command-palette-backdrop"));
  expect(screen.getByTestId("open-search")).toHaveFocus();
});
