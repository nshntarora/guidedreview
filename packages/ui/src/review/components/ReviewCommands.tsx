import { useCommandAction } from "@guided-review/ui/review/commandPalette";
import { useReviewHost } from "@guided-review/ui/review/host";
import { useReviewStore } from "@guided-review/ui/review/store";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

/** Defaults owned by the layout, available regardless of the selected review content. */
export function ReviewCommands({
  allowExit,
  showScopePicker,
}: {
  allowExit: boolean;
  showScopePicker: boolean;
}) {
  const host = useReviewHost();
  const mode = useReviewStore((state) => state.diffViewMode);
  const setMode = useReviewStore((state) => state.setDiffViewMode);
  useCommandAction({
    id: "settings",
    label: "View settings",
    keywords: "provider model API key preferences",
    shortcut: host.kind === "local" ? ["mod", ","] : undefined,
    onSelect: () => host.connectProvider(),
  });
  useCommandAction({
    id: "keyboard-shortcuts",
    label: "View keyboard shortcuts",
    keywords: "help keys hotkeys",
    content: (
      <KeyboardShortcuts
        allowExit={allowExit}
        showSettings={host.kind === "local"}
        showScopePicker={showScopePicker}
      />
    ),
  });
  useCommandAction({
    id: "view-mode",
    label: "Change view mode",
    keywords: "diff unified split layout",
    placeholder: "Choose a diff view…",
    results: (query) =>
      (["unified", "split"] as const)
        .filter((value) => value.includes(query.trim().toLowerCase()))
        .map((value) => ({
          id: value,
          label: value === "unified" ? "Unified view" : "Split view",
          description: value === mode ? "Current view" : undefined,
          onSelect: () => setMode(value),
        })),
  });
  return null;
}
