import { useEffect, useState } from "react";
import {
  PROVIDER_LIST,
  defaultModelFor,
  modelsForProvider,
  type ProviderId,
} from "@guided-review/core";
import { Button, Input, Label, Select } from "@guided-review/ui";

interface SettingsPanelProps {
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsPanel({ token, onClose, onSaved }: SettingsPanelProps) {
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState(defaultModelFor("anthropic"));
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/settings?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: { provider: ProviderId; model: string; hasKey: boolean }) => {
        setProvider(data.provider);
        setModel(data.model);
        setHasKey(data.hasKey);
      })
      .catch(() => setError("Could not load settings."));
  }, [token]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings?token=${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey }),
      });
      if (!res.ok) throw new Error("Save failed.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const models = modelsForProvider(provider);

  return (
    <div className="fixed inset-0 z-[2147483001] flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-foreground">
        <h2 className="m-0 mb-4 text-lg font-semibold">AI provider</h2>
        <p className="m-0 mb-4 text-sm text-muted">
          Keys stay on this machine in ~/.config/guided-review/config.json. Traffic goes to your
          provider only.
        </p>
        <div className="flex flex-col gap-3">
          <Label>
            Provider
            <Select
              value={provider}
              options={PROVIDER_LIST.map((p) => ({ value: p.id, label: p.displayName }))}
              onChange={(value) => {
                const next = value as ProviderId;
                setProvider(next);
                setModel(defaultModelFor(next));
              }}
            />
          </Label>
          <Label>
            Model
            <Select
              value={model}
              options={models.map((m) => ({ value: m.id, label: m.displayName }))}
              onChange={setModel}
            />
          </Label>
          <Label>
            API key {hasKey ? "(leave blank to keep the stored key)" : ""}
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </Label>
          {error && (
            <p className="m-0 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
