import { useEffect, useMemo, useState } from "react";
import type { ProviderId, ProviderSettings } from "../lib/types";
import {
  defaultModelFor,
  getProvider,
  modelsForProvider,
  PROVIDERS,
} from "../lib/providers/catalog";
import { getProviderSettings, setProviderSettings } from "../lib/settings";
import { testConnection } from "../lib/messaging";
import { Select, type SelectOption } from "./components/Select";
import { ProviderIcon } from "./components/ProviderIcon";
import { ActionSpinner } from "./components/ActionSpinner";
import { BrandHeader } from "./BrandHeader";
import { cn } from "../lib/cn";

type ActionStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

const fieldControl =
  "w-full rounded-md border border-opt-border bg-opt-subtle px-2.5 py-2 text-base text-opt-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-opt-accent";

const actionBtn =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-base font-semibold disabled:cursor-default disabled:opacity-60";

function OptionRow({ icon, label }: { icon: ProviderId; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ProviderIcon provider={icon} size={16} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function Options() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState<ActionStatus>({ kind: "idle" });
  const [connection, setConnection] = useState<ActionStatus>({ kind: "idle" });

  useEffect(() => {
    void getProviderSettings().then(setSettings);
  }, []);

  const providerOptions: SelectOption<ProviderId>[] = useMemo(
    () =>
      PROVIDERS.map((p) => ({
        value: p.id,
        label: p.displayName,
        content: () => <OptionRow icon={p.id} label={p.displayName} />,
      })),
    [],
  );

  const modelOptions: SelectOption[] = useMemo(() => {
    if (!settings) return [];
    return modelsForProvider(settings.provider).map((m) => ({
      value: m.id,
      label: m.displayName,
      content: () => <OptionRow icon={m.provider} label={m.displayName} />,
    }));
  }, [settings?.provider]);

  if (!settings) return null;

  const providerDef = getProvider(settings.provider);
  const busy = saveStatus.kind === "working" || connection.kind === "working";

  const onProviderChange = (provider: ProviderId) => {
    setSettings({ ...settings, provider, model: defaultModelFor(provider) });
    setSaveStatus({ kind: "idle" });
    setConnection({ kind: "idle" });
  };

  const onModelChange = (model: string) => {
    setSettings({ ...settings, model });
    setSaveStatus({ kind: "idle" });
  };

  const onApiKeyChange = (apiKey: string) => {
    setSettings({ ...settings, apiKey });
    setSaveStatus({ kind: "idle" });
    setConnection({ kind: "idle" });
  };

  const onSave = async () => {
    setSaveStatus({ kind: "working" });
    setConnection({ kind: "idle" });
    try {
      await setProviderSettings(settings);
      setSaveStatus({ kind: "ok", message: "Saved" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save settings.";
      setSaveStatus({ kind: "error", message });
    }
  };

  const onTestConnection = async () => {
    setConnection({ kind: "working" });
    setSaveStatus({ kind: "idle" });
    try {
      // Persist on-screen values so the test matches what the user sees.
      await setProviderSettings(settings);
      const result = await testConnection(settings);
      if (result.ok) {
        setConnection({ kind: "ok", message: "Connection works" });
      } else {
        setConnection({
          kind: "error",
          message: result.error ?? "Connection failed.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection test failed unexpectedly.";
      setConnection({ kind: "error", message });
    }
  };

  const statusMessage =
    saveStatus.kind === "ok" || saveStatus.kind === "error"
      ? saveStatus
      : connection.kind === "ok" || connection.kind === "error"
        ? connection
        : null;

  return (
    <main id="main-content" className="mx-auto max-w-[480px] px-6 py-8">
      <BrandHeader />
      <p className="mb-6 text-base text-opt-muted">
        Choose an AI provider and paste your own API key. The key is stored only in this
        browser and is used solely to annotate PR diffs you open.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-base font-semibold" id="provider-label" htmlFor="provider">
          Provider
        </label>
        <Select
          id="provider"
          aria-labelledby="provider-label"
          value={settings.provider}
          options={providerOptions}
          onChange={onProviderChange}
          disabled={busy}
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-base font-semibold" id="model-label" htmlFor="model">
          Model
        </label>
        <Select
          id="model"
          aria-labelledby="model-label"
          value={settings.model}
          options={modelOptions}
          onChange={onModelChange}
          disabled={busy}
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-base font-semibold" htmlFor="apiKey">
          API key
        </label>
        <input
          id="apiKey"
          className={fieldControl}
          type="password"
          autoComplete="off"
          placeholder={providerDef.keyPlaceholder}
          value={settings.apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={busy}
          aria-describedby="apiKey-hint"
        />
        <p id="apiKey-hint" className="mt-1 text-sm text-opt-muted">
          Stored locally on this device via chrome.storage.local — never synced.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className={cn(
            actionBtn,
            "border-opt-accent bg-opt-accent text-opt-accent-on",
            "enabled:hover:border-opt-accent-hover enabled:hover:bg-opt-accent-hover",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent",
          )}
          onClick={onSave}
          disabled={busy}
        >
          {saveStatus.kind === "working" && <ActionSpinner label="Saving" />}
          {saveStatus.kind === "working" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className={cn(
            actionBtn,
            "border-opt-border bg-opt-subtle text-opt-text",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent",
          )}
          onClick={onTestConnection}
          disabled={!settings.apiKey || busy}
        >
          {connection.kind === "working" && <ActionSpinner label="Testing connection" />}
          {connection.kind === "working" ? "Testing…" : "Test connection"}
        </button>
        {statusMessage && (
          <span
            role="status"
            aria-live="polite"
            className={cn(
              "text-base",
              statusMessage.kind === "ok" && "text-opt-ok",
              statusMessage.kind === "error" && "text-opt-error",
            )}
          >
            {statusMessage.kind === "error" ? `Error: ${statusMessage.message}` : statusMessage.message}
          </span>
        )}
      </div>

      <nav className="mt-8 border-t border-opt-border pt-6" aria-label="About">
        <a
          href="#about"
          className="text-base font-semibold text-opt-muted no-underline hover:text-opt-text hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent"
        >
          About Guided Review
        </a>
      </nav>
    </main>
  );
}
