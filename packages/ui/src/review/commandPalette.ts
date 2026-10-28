import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

export interface CommandResult {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  content?: ReactNode;
  testId?: string;
  onSelect: () => void;
}

export interface CommandAction extends Omit<CommandResult, "onSelect" | "testId"> {
  keywords?: string;
  shortcut?: readonly string[];
  onSelect?: () => void;
  /** A nested search/choice step, rendered by the same palette. */
  results?: (query: string) => CommandResult[];
  placeholder?: string;
  emptyMessage?: string;
}

interface CommandPaletteState {
  actions: Map<string, CommandAction>;
  isOpen: boolean;
  actionId: string | null;
  focusRequestId: number;
  open: (actionId?: string) => void;
  close: () => void;
  register: (action: CommandAction) => () => void;
}

function createCommandPalette() {
  let previousFocus: Element | null = null;
  return createStore<CommandPaletteState>((set) => ({
    actions: new Map(),
    isOpen: false,
    actionId: null,
    focusRequestId: 0,
    open: (actionId) =>
      set((state) => {
        if (!state.isOpen) {
          previousFocus = document.activeElement;
          while (previousFocus?.shadowRoot?.activeElement)
            previousFocus = previousFocus.shadowRoot.activeElement;
        }
        return {
          isOpen: true,
          actionId: actionId ?? null,
          focusRequestId: state.focusRequestId + 1,
        };
      }),
    close: () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
      previousFocus = null;
      set({ isOpen: false, actionId: null });
    },
    register: (action) => {
      set((state) => ({ actions: new Map(state.actions).set(action.id, action) }));
      return () => {
        set((state) => {
          // An older component's cleanup must not remove a newer registration.
          if (state.actions.get(action.id) !== action) return state;
          const actions = new Map(state.actions);
          actions.delete(action.id);
          return { actions };
        });
      };
    },
  }));
}

const CommandPaletteContext = createContext<ReturnType<typeof createCommandPalette> | null>(null);

/** One registry per review layout; never shared between hosts or overlay instances. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createCommandPalette);
  return createElement(CommandPaletteContext.Provider, { value: store }, children);
}

export function useCommandPalette<T>(selector: (state: CommandPaletteState) => T): T {
  const store = useContext(CommandPaletteContext);
  if (!store) throw new Error("CommandPaletteProvider is missing from the review layout.");
  return useStore(store, selector);
}

/** Register on mount, update handlers with props, and remove on unmount. IDs must be unique. */
export function useCommandAction(action: CommandAction | null): void {
  const store = useContext(CommandPaletteContext);
  if (!store) throw new Error("CommandPaletteProvider is missing from the review layout.");
  useEffect(() => {
    if (!action) return;
    return store.getState().register(action);
  }, [store, action]);
}
