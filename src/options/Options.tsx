import { useEffect, useState } from "react";
import type { ProviderId, ProviderSettings } from "../lib/types";
import { DEFAULT_MODELS } from "../lib/types";
import { getProviderSettings, setProviderSettings } from "../lib/settings";
import { testConnection } from "../lib/messaging";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "OpenAI",
  grok: "Grok (xAI)",
};

const MODEL_OPTIONS: Record<ProviderId, string[]> = {
  anthropic: [
    "claude-opus-4-8",
    "claude-sonnet-5",
    "claude-haiku-4-5",
  ],
  openai: ["gpt-4.1"],
  grok: ["grok-4"],
};

type ConnectionStatus = { kind: "idle" } | { kind: "testing" } | { kind: "ok" } | { kind: "error"; message: string };

export function Options() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus>({ kind: "idle" });

  useEffect(() => {
    void getProviderSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const onProviderChange = (provider: ProviderId) => {
    setSettings({ ...settings, provider, model: DEFAULT_MODELS[provider] });
    setSaved(false);
    setConnection({ kind: "idle" });
  };

  const onModelChange = (model: string) => {
    setSettings({ ...settings, model });
    setSaved(false);
  };

  const onApiKeyChange = (apiKey: string) => {
    setSettings({ ...settings, apiKey });
    setSaved(false);
    setConnection({ kind: "idle" });
  };

  const onSave = async () => {
    await setProviderSettings(settings);
    setSaved(true);
  };

  const onTestConnection = async () => {
    setConnection({ kind: "testing" });
    await setProviderSettings(settings); // test against what's on screen, not last-saved
    const result = await testConnection(settings);
    if (result.ok) {
      setConnection({ kind: "ok" });
    } else {
      setConnection({ kind: "error", message: result.error ?? "Connection failed." });
    }
  };

  return (
    <div className="opt-container">
      <h1 className="opt-title">Guided Review</h1>
      <p className="opt-subtitle">
        Choose an AI provider and paste your own API key. The key is stored only in this
        browser and is used solely to annotate PR diffs you open.
      </p>

      <div className="opt-field">
        <label className="opt-label" htmlFor="provider">
          Provider
        </label>
        <select
          id="provider"
          className="opt-select"
          value={settings.provider}
          onChange={(e) => onProviderChange(e.target.value as ProviderId)}
        >
          {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((id) => (
            <option key={id} value={id}>
              {PROVIDER_LABELS[id]}
            </option>
          ))}
        </select>
      </div>

      <div className="opt-field">
        <label className="opt-label" htmlFor="model">
          Model
        </label>
        <select
          id="model"
          className="opt-select"
          value={settings.model}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {MODEL_OPTIONS[settings.provider].map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div className="opt-field">
        <label className="opt-label" htmlFor="apiKey">
          API key
        </label>
        <input
          id="apiKey"
          className="opt-input"
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          value={settings.apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
        />
        <p className="opt-hint">Stored locally on this device via chrome.storage.local — never synced.</p>
      </div>

      <div className="opt-actions">
        <button className="opt-btn" onClick={onSave}>
          Save
        </button>
        <button
          className="opt-btn opt-secondary"
          onClick={onTestConnection}
          disabled={!settings.apiKey || connection.kind === "testing"}
        >
          {connection.kind === "testing" ? "Testing…" : "Test connection"}
        </button>
        {saved && connection.kind === "idle" && <span className="opt-status opt-ok">Saved</span>}
        {connection.kind === "ok" && <span className="opt-status opt-ok">Connection works</span>}
        {connection.kind === "error" && <span className="opt-status opt-error">{connection.message}</span>}
      </div>
    </div>
  );
}
