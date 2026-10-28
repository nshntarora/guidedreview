import { useRef } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@guided-review/ui";
import {
  CommandPaletteProvider,
  useCommandAction,
  useCommandPalette,
  type CommandAction,
} from "@guided-review/ui/review/commandPalette";
import { CommandPalette } from "./CommandPalette";

function RegisteredAction({ action }: { action: CommandAction | null }) {
  useCommandAction(action);
  return null;
}

function Layout({ actions }: { actions: CommandAction[] }) {
  const open = useCommandPalette((state) => state.open);
  const dialogRef = useRef<HTMLDivElement>(null);
  const keyActionRef = useRef<((event: KeyboardEvent) => boolean) | null>(null);
  return (
    <>
      <Button data-testid="open-actions" onClick={() => open()}>
        Actions
      </Button>
      {actions.map((action) => (
        <RegisteredAction key={action.id} action={action} />
      ))}
      <CommandPalette dialogRef={dialogRef} keyActionRef={keyActionRef} />
    </>
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

it("wraps keyboard selection, resets it when filtering, and recovers from no matches", async () => {
  const user = userEvent.setup();
  const settings = vi.fn();
  const help = vi.fn();
  render(
    <CommandPaletteProvider>
      <Layout
        actions={[
          { id: "settings", label: "Settings", keywords: "provider", onSelect: settings },
          { id: "help", label: "Help", description: "Keyboard shortcuts", onSelect: help },
        ]}
      />
    </CommandPaletteProvider>,
  );
  const trigger = screen.getByTestId("open-actions");
  await user.click(trigger);
  const input = screen.getByTestId("command-palette-input");
  await waitFor(() => expect(input).toHaveFocus());
  const first = screen.getByTestId("command-action-settings");
  const last = screen.getByTestId("command-action-help");
  await user.keyboard("{ArrowUp}");
  expect(last).toHaveAttribute("aria-selected", "true");
  expect(input).toHaveAttribute("aria-activedescendant", last.id);
  await user.keyboard("{ArrowDown}");
  expect(first).toHaveAttribute("aria-selected", "true");
  await user.keyboard("{ArrowDown}");
  await user.type(input, "provider");
  expect(first).toHaveAttribute("aria-selected", "true");
  expect(input).toHaveAttribute("aria-activedescendant", first.id);
  expect(screen.queryByTestId("command-action-help")).not.toBeInTheDocument();

  await user.clear(input);
  await user.type(input, "zzzzzzzzzz");
  expect(screen.getByTestId("command-palette-empty")).toBeVisible();
  expect(input).not.toHaveAttribute("aria-activedescendant");
  await user.keyboard("{ArrowUp}{ArrowDown}{Enter}");
  expect(settings).not.toHaveBeenCalled();
  expect(help).not.toHaveBeenCalled();
  expect(screen.getByTestId("command-palette")).toBeVisible();

  await user.clear(input);
  await user.type(input, "shortcuts");
  await user.keyboard("{Enter}");
  expect(help).toHaveBeenCalledOnce();
  expect(settings).not.toHaveBeenCalled();
  expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("keeps disabled actions open and uses the latest handler and availability", async () => {
  const user = userEvent.setup();
  const oldHandler = vi.fn();
  const newHandler = vi.fn();
  function App({ enabled = false, mounted = true, handler = oldHandler }) {
    return (
      <CommandPaletteProvider>
        <Layout
          actions={[
            { id: "settings", label: "Settings" },
            ...(mounted
              ? [{ id: "notes", label: "Generate prompt", disabled: !enabled, onSelect: handler }]
              : []),
          ]}
        />
      </CommandPaletteProvider>
    );
  }
  const { rerender } = render(<App />);
  await user.click(screen.getByTestId("open-actions"));
  const input = screen.getByTestId("command-palette-input");
  await waitFor(() => expect(input).toHaveFocus());
  await user.keyboard("{ArrowDown}{Enter}");
  const notes = screen.getByTestId("command-action-notes");
  expect(notes).toHaveAttribute("aria-disabled", "true");
  await user.click(notes);
  expect(oldHandler).not.toHaveBeenCalled();
  expect(screen.getByTestId("command-palette")).toBeVisible();
  rerender(<App enabled handler={newHandler} />);
  await user.keyboard("{Enter}");
  expect(newHandler).toHaveBeenCalledOnce();
  expect(oldHandler).not.toHaveBeenCalled();
  expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  await user.click(screen.getByTestId("open-actions"));
  rerender(<App mounted={false} />);
  expect(screen.queryByTestId("command-action-notes")).not.toBeInTheDocument();
  expect(screen.getByTestId("command-action-settings")).toBeInTheDocument();
});

it("returns from nested choices only on empty Backspace and executes a choice once", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(
    <CommandPaletteProvider>
      <Layout
        actions={[
          {
            id: "view-mode",
            label: "Change view mode",
            results: (query) =>
              ["unified", "split"]
                .filter((mode) => mode.includes(query))
                .map((mode) => ({ id: mode, label: mode, onSelect: () => select(mode) })),
          },
        ]}
      />
    </CommandPaletteProvider>,
  );
  const trigger = screen.getByTestId("open-actions");
  await user.click(trigger);
  await user.click(screen.getByTestId("command-action-view-mode"));
  let input = screen.getByTestId("command-palette-input");
  await waitFor(() => expect(input).toHaveFocus());
  await user.type(input, "u");
  await user.keyboard("{Backspace}");
  expect(screen.getByTestId("command-result-unified")).toBeVisible();
  await user.keyboard("{Backspace}");
  expect(screen.getByTestId("command-action-view-mode")).toBeVisible();
  expect(select).not.toHaveBeenCalled();
  await user.click(screen.getByTestId("command-action-view-mode"));
  input = screen.getByTestId("command-palette-input");
  await waitFor(() => expect(input).toHaveFocus());
  await user.keyboard("{ArrowDown}{Enter}");
  expect(select).toHaveBeenCalledExactlyOnceWith("split");
  expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("ignores composition and modified Enter and lets focused buttons own Enter", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(
    <CommandPaletteProvider>
      <Layout actions={[{ id: "settings", label: "Settings", onSelect: select }]} />
    </CommandPaletteProvider>,
  );
  await user.click(screen.getByTestId("open-actions"));
  const input = screen.getByTestId("command-palette-input");
  await waitFor(() => expect(input).toHaveFocus());
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  await user.keyboard("{Control>}{Enter}{/Control}{Meta>}{Enter}{/Meta}{Alt>}{Enter}{/Alt}");
  expect(select).not.toHaveBeenCalled();
  expect(screen.getByTestId("command-palette")).toBeVisible();
  await user.tab();
  expect(screen.getByTestId("command-palette-close")).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(select).not.toHaveBeenCalled();
  expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  expect(screen.getByTestId("open-actions")).toHaveFocus();
});
