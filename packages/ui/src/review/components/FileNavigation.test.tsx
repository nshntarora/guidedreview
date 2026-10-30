import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildFileTree } from "@guided-review/ui/review/fileNavigation";
import { getFocusableElements } from "@guided-review/ui/review/focusTrap";
import { useReviewStore } from "@guided-review/ui/review/store";
import type { ParsedDiff } from "@guided-review/ui/review/types";
import { FileNavigation } from "./FileNavigation";

beforeEach(() => useReviewStore.setState(useReviewStore.getInitialState(), true));
afterEach(() => {
  cleanup();
  useReviewStore.setState(useReviewStore.getInitialState(), true);
});

it("excludes collapsed descendants from navigation and selects a nested file after reopening", async () => {
  const user = userEvent.setup();
  const diff: ParsedDiff = {
    files: [{ path: "src/auth/login.ts", status: "modified", isBinaryOrElided: false, hunks: [] }],
  };
  useReviewStore.getState().setDiff(diff);
  const onSelect = vi.fn();
  const { container } = render(
    <FileNavigation directory={buildFileTree(diff)} onSelect={onSelect} />,
  );
  const directory = screen.getByTestId("file-directory-src");
  let nestedDirectory = screen.getByTestId("file-directory-src/auth");
  let file = screen.getByTestId("review-file-src/auth/login.ts");

  expect(getFocusableElements(container)).toEqual([directory, nestedDirectory, file]);
  await user.click(directory);
  expect(directory).toHaveAttribute("aria-expanded", "false");
  expect(getFocusableElements(container)).toEqual([directory]);
  expect(onSelect).not.toHaveBeenCalled();

  await user.keyboard("{Enter}");
  expect(directory).toHaveAttribute("aria-expanded", "true");
  nestedDirectory = screen.getByTestId("file-directory-src/auth");
  file = screen.getByTestId("review-file-src/auth/login.ts");
  await user.tab();
  expect(nestedDirectory).toHaveFocus();
  await user.tab();
  expect(file).toHaveFocus();
  await user.keyboard("{Enter}");

  expect(useReviewStore.getState().selection).toEqual({ kind: "file", path: "src/auth/login.ts" });
  expect(file).toHaveAttribute("aria-current", "true");
  expect(onSelect).toHaveBeenCalledTimes(1);
});
