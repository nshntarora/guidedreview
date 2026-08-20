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
import { trapTabKey } from "@extension/content/overlay/focusTrap";
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
        const root = getConfirmationDialogElement() ?? dialogRef.current;
        if (root) trapTabKey(event, root);
        return;
      }
      // Swallow ⌘/Ctrl+, so the browser does not steal it for its own prefs,
      // and jump to Settings if About is showing.
      if (isSettingsShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (route !== "settings") window.location.hash = "settings";
        return;
      }
      if (event.key !== "Escape") return;
      if (isConfirmationOpen() || isOpenSelectEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, route]);

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
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-5">
            <nav
              className="flex items-center gap-2 text-base sm:gap-3 md:gap-5"
              aria-label="Settings"
            >
              {ROUTES.map((item) => {
                const active = route === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(NAV_LINK_CLASS, active && "text-primary")}
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
    <SettingsShell route={route} onClose={requestClose}>
      <div hidden={route !== "settings"}>
        <Settings onSaved={onSaved} onDirtyChange={setDirty} />
      </div>
      {route === "about" ? <About /> : null}
    </SettingsShell>
  );
}
