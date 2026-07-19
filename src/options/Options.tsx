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
import { cn } from "../lib/cn";

type ActionStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

const fieldControl =
  "w-full rounded-md border border-opt-border bg-opt-subtle px-2.5 py-2 text-[13px] text-opt-text";

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
    <div className="mx-auto max-w-[480px] px-6 py-8">
      <div className="mb-2 flex items-center gap-3">
        <img
          className="h-10 w-10 shrink-0 rounded-lg"
          src={chrome.runtime.getURL("icon.png")}
          alt=""
          width={40}
          height={40}
        />
        <h1 className="m-0 text-lg font-bold">Guided Review</h1>
      </div>
      <p className="mb-6 text-[13px] text-opt-muted">
        Choose an AI provider and paste your own API key. The key is stored only in this
        browser and is used solely to annotate PR diffs you open.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-semibold" id="provider-label" htmlFor="provider">
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
        <label className="mb-1.5 block text-[13px] font-semibold" id="model-label" htmlFor="model">
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
        <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="apiKey">
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
        />
        <p className="mt-1 text-xs text-opt-muted">
          Stored locally on this device via chrome.storage.local — never synced.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-md border border-opt-accent bg-opt-accent px-4 py-2 text-[13px] font-semibold text-opt-accent-on",
            "disabled:cursor-default disabled:opacity-60",
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
            "inline-flex cursor-pointer items-center gap-2 rounded-md border border-opt-border bg-opt-subtle px-4 py-2 text-[13px] font-semibold text-opt-text",
            "disabled:cursor-default disabled:opacity-60",
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
              "text-[13px]",
              statusMessage.kind === "ok" && "text-opt-ok",
              statusMessage.kind === "error" && "text-opt-error",
            )}
          >
            {statusMessage.message}
          </span>
        )}
      </div>
    </div>
  );
}
