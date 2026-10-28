import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  Button,
  CloseIcon,
  cn,
  ConfirmationHost,
  confirm,
  getConfirmationDialogElement,
  isConfirmationOpen,
  Kbd,
} from "@guided-review/ui";
import { trapTabKey } from "@guided-review/ui/review/focusTrap";
import {
  CommandPaletteProvider,
  useCommandAction,
  useCommandPalette,
} from "@guided-review/ui/review/commandPalette";
import { CommandPalette } from "@guided-review/ui/review/components/CommandPalette";
import { ShortcutKeys } from "@guided-review/ui/review/components/ShortcutKeys";
import { About } from "./About";
import { Settings, type PublicSettings } from "./Settings";

export type SettingsRoute = "settings" | "about";

const DOCS_URL = "https://guidedreview.dev/docs";

const ROUTES = [
  { id: "settings", label: "Settings", title: "Guided Review — Settings", href: "#settings" },
  { id: "about", label: "About", title: "Guided Review — About", href: "#about" },
] as const;

const NAV_LINK_CLASS = "text-foreground hover:text-primary";

function isOpenSelectEvent(event: KeyboardEvent): boolean {
  return event
    .composedPath()
    .some((node) => node instanceof HTMLElement && node.getAttribute("role") === "listbox");
}

function isSettingsShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key === ",";
}

function SettingsShell({
  route,
  onClose,
  children,
}: {
  route: SettingsRoute;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const paletteDialogRef = useRef<HTMLDivElement>(null);
  const paletteKeyRef = useRef<((event: KeyboardEvent) => boolean) | null>(null);
  const paletteOpen = useCommandPalette((state) => state.isOpen);
  const openPalette = useCommandPalette((state) => state.open);
  const closePalette = useCommandPalette((state) => state.close);

  useCommandAction({
    id: "settings",
    label: "View settings",
    keywords: "provider model API key preferences",
    shortcut: ["mod", ","],
    onSelect: () => {
      window.location.hash = "settings";
    },
  });
  useCommandAction({
    id: "about",
    label: "View about",
    keywords: "Guided Review version",
    onSelect: () => {
      window.location.hash = "about";
    },
  });
  useCommandAction({
    id: "back-to-review",
    label: "Back to review",
    keywords: "close settings diff files",
    shortcut: ["Esc"],
    onSelect: onClose,
  });

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Tab") {
        const root =
          getConfirmationDialogElement() ??
          (paletteOpen ? paletteDialogRef.current : dialogRef.current);
        if (root) trapTabKey(event, root);
        return;
      }
      if (isConfirmationOpen()) return;
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        event.stopPropagation();
        openPalette();
        return;
      }
      // Swallow ⌘/Ctrl+, so the browser does not steal it for its own prefs,
      // and jump to Settings if About is showing.
      if (isSettingsShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (paletteOpen) closePalette();
        if (route !== "settings") window.location.hash = "settings";
        return;
      }
      if (paletteOpen) {
        if (paletteKeyRef.current?.(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (event.key !== "Escape") return;
      if (isOpenSelectEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, route, paletteOpen, openPalette, closePalette]);

  function handleBrandClick(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    onClose();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={route === "about" ? "About" : "Settings"}
      aria-keyshortcuts="Escape"
      tabIndex={-1}
      className="gr-settings fixed inset-0 z-[2147483010] flex flex-col overflow-y-auto bg-background outline-none"
      data-testid="settings-modal"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
          <a
            href="#review"
            onClick={handleBrandClick}
            className="gr-settings-brand shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <img
              src="/logo.svg"
              alt="Guided Review"
              width={350}
              height={49}
              className="block h-6 w-auto sm:h-7"
            />
          </a>

          <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3 md:gap-5">
            <nav
              className="flex items-center gap-2 text-base sm:gap-3 md:gap-5"
              aria-label="Settings"
              data-testid="settings-nav"
            >
              {ROUTES.map((item) => {
                const active = route === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(NAV_LINK_CLASS, active && "text-primary")}
                    data-testid={`settings-nav-${item.id}`}
                  >
                    {item.label}
                  </a>
                );
              })}
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={NAV_LINK_CLASS}
              >
                Docs
              </a>
            </nav>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openPalette()}
              aria-keyshortcuts="Meta+k Control+k"
              data-testid="settings-open-command-palette"
            >
              Actions
              <ShortcutKeys keys={["mod", "K"]} join="chord" />
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose} data-testid="settings-close">
              <CloseIcon />
              Close
              <Kbd>Esc</Kbd>
            </Button>
          </div>
        </div>
      </header>

      <div id="main-content" className="w-full flex-1 px-5 py-8 sm:px-6">
        {children}
      </div>
      {paletteOpen && (
        <div className="fixed inset-0 z-50">
          <CommandPalette dialogRef={paletteDialogRef} keyActionRef={paletteKeyRef} />
        </div>
      )}
      <ConfirmationHost />
    </div>
  );
}

export function SettingsApp({
  route,
  onSaved,
  onClose,
}: {
  route: SettingsRoute;
  onSaved?: (settings: PublicSettings) => void;
  onClose: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (!dirtyRef.current) {
      onCloseRef.current();
      return;
    }
    confirm({
      title: "Discard unsaved settings?",
      body: "Provider, model, or key changes on this screen have not been saved.",
      variant: "destructive",
      okButtonText: "Discard",
      cancelButtonText: "Keep editing",
      okButtonHandler: () => {
        onCloseRef.current();
      },
    });
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = ROUTES.find((r) => r.id === route)?.title ?? "Guided Review";
    return () => {
      document.title = previous;
    };
  }, [route]);

  return (
    <CommandPaletteProvider>
      <SettingsShell route={route} onClose={requestClose}>
        <div hidden={route !== "settings"}>
          <Settings onSaved={onSaved} onDirtyChange={setDirty} />
        </div>
        {route === "about" ? <About /> : null}
      </SettingsShell>
    </CommandPaletteProvider>
  );
}
