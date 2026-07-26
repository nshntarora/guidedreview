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
import { GitHubAuthSection } from "./GitHubAuthSection";
import { SettingsCard } from "./SettingsCard";
import { StatusCallout } from "./StatusCallout";
import { Toggle } from "./Toggle";
import { Button, Input, Label, Select, Spinner, type SelectOption } from "@guided-review/ui";

const CONFIGURE_PROVIDER_DOCS_URL = "https://guidedreview.dev/docs/configure-provider";

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
    <main id="main-content">
      <header className="mb-8">
        <h1 className="m-0 font-brand text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-2 m-0 text-base leading-relaxed text-muted text-balance">
          Connect GitHub and choose an AI provider. Keys and tokens stay in this browser only.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <GitHubAuthSection />

        <SettingsCard
          title="AI Provider"
          titleId="ai-provider-heading"
          description={
            <>
              Bring your own key for Claude, OpenAI, or Grok.{" "}
              <a
                href={CONFIGURE_PROVIDER_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Setup docs
              </a>
            </>
          }
        >
          <div className="space-y-4">
            <div>
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

            <div>
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

            <div>
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
              <p id="apiKey-hint" className="mt-1.5 m-0 text-sm text-muted">
                Stored locally on this device via{" "}
                <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-sm text-foreground">
                  chrome.storage.local
                </code>{" "}
                — never synced.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button onClick={onSave} disabled={busy}>
                {saveStatus.kind === "working" && <Spinner size={14} label="Saving" />}
                {saveStatus.kind === "working" ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="secondary"
                onClick={onTestConnection}
                disabled={!settings.apiKey || busy}
              >
                {connection.kind === "working" && <Spinner size={14} label="Testing connection" />}
                {connection.kind === "working" ? "Testing…" : "Test Connection"}
              </Button>
            </div>

            {statusMessage && (
              <StatusCallout kind={statusMessage.kind} message={statusMessage.message} />
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Review"
          titleId="review-heading"
          description="How Guided Review behaves when you open a pull request."
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p
                id="autoOpenOnFilesTab-label"
                className="m-0 font-brand text-base font-bold tracking-tight text-foreground"
              >
                Automatically open on Files changed
              </p>
              <p id="autoOpenOnFilesTab-hint" className="mt-1 m-0 text-sm text-muted">
                When enabled, Guided Review opens (or resumes) automatically on a PR’s Files changed
                / Changes tab. You can still start it from the button anytime.
              </p>
            </div>
            <Toggle
              id="autoOpenOnFilesTab"
              checked={autoOpenOnFilesTab}
              onChange={(enabled) => void onAutoOpenChange(enabled)}
              aria-labelledby="autoOpenOnFilesTab-label"
              aria-describedby="autoOpenOnFilesTab-hint"
            />
          </div>
        </SettingsCard>
      </div>

      <p className="mt-6 m-0 text-sm leading-relaxed text-muted">
        Keys and tokens stay in this browser. Diffs go only to GitHub and the provider you choose.
      </p>
    </main>
  );
}
