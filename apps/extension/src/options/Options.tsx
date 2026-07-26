import { useEffect, useMemo, useState } from "react";
import type { ProviderId, ProviderSettings } from "../lib/types";
import {
  defaultModelFor,
  getProvider,
  modelsForProvider,
  PROVIDERS,
} from "../lib/providers/catalog";
import { getAutoOpenOnFilesTab, setAutoOpenOnFilesTab } from "../lib/autoOpenOnFilesTab";
import { getProviderSettings, setProviderSettings } from "../lib/settings";
import { testConnection } from "../lib/messaging";
import { ProviderIcon } from "./components/ProviderIcon";
import { BrandHeader } from "./BrandHeader";
import { GitHubAuthSection } from "./GitHubAuthSection";
import { Button, Input, Label, Select, Spinner, cn, type SelectOption } from "@guided-review/ui";

type ActionStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

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
  const [autoOpenOnFilesTab, setAutoOpenOnFilesTabState] = useState(false);
  const [saveStatus, setSaveStatus] = useState<ActionStatus>({ kind: "idle" });
  const [connection, setConnection] = useState<ActionStatus>({ kind: "idle" });

  useEffect(() => {
    void getProviderSettings().then(setSettings);
    void getAutoOpenOnFilesTab().then(setAutoOpenOnFilesTabState);
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
      const message = error instanceof Error ? error.message : "Failed to save settings.";
      setSaveStatus({ kind: "error", message });
    }
  };

  const onAutoOpenChange = async (enabled: boolean) => {
    setAutoOpenOnFilesTabState(enabled);
    await setAutoOpenOnFilesTab(enabled);
  };

  const onTestConnection = async () => {
    setConnection({ kind: "working" });
    setSaveStatus({ kind: "idle" });
    try {
      // Persist on-screen values so the test matches what the user sees.
      await setProviderSettings(settings);
      const result = await testConnection(settings);
      if (result.ok) {
        setConnection({ kind: "ok", message: "Connection OK" });
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
        Connect GitHub and choose an AI provider. Keys and tokens stay in this browser only.
      </p>

      <GitHubAuthSection />

      <h2 className="mb-4 text-base font-semibold text-opt-text">AI Provider</h2>

      <div className="mb-4">
        <Label id="provider-label" htmlFor="provider">
          Provider
        </Label>
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
        <Label id="model-label" htmlFor="model">
          Model
        </Label>
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
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
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
        <Button onClick={onSave} disabled={busy}>
          {saveStatus.kind === "working" && <Spinner surface="app" size={14} label="Saving" />}
          {saveStatus.kind === "working" ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" onClick={onTestConnection} disabled={!settings.apiKey || busy}>
          {connection.kind === "working" && (
            <Spinner surface="app" size={14} label="Testing connection" />
          )}
          {connection.kind === "working" ? "Testing…" : "Test Connection"}
        </Button>
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
            {statusMessage.kind === "error"
              ? `Error: ${statusMessage.message}`
              : statusMessage.message}
          </span>
        )}
      </div>

      <h2 className="mb-4 mt-8 text-base font-semibold text-opt-text">Review</h2>
      <div className="mb-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="autoOpenOnFilesTab"
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border-opt-border accent-opt-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent"
            checked={autoOpenOnFilesTab}
            onChange={(e) => void onAutoOpenChange(e.target.checked)}
            aria-describedby="autoOpenOnFilesTab-hint"
          />
          <span className="min-w-0">
            <span className="block text-base font-semibold text-opt-text">
              Automatically open when I go to Files changed tab in a PR
            </span>
            <span id="autoOpenOnFilesTab-hint" className="mt-1 block text-sm text-opt-muted">
              When enabled, Guided Review opens (or resumes) automatically on a PR’s Files changed /
              Changes tab. You can still start it from the button anytime.
            </span>
          </span>
        </label>
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
