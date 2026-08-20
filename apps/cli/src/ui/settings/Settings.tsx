import { useEffect, useState } from "react";
import {
  PROVIDER_LIST,
  defaultModelFor,
  getProvider,
  modelsForProvider,
  type ProviderId,
} from "@guided-review/core";
import {
  Button,
  Callout,
  Card,
  cn,
  HelpDetails,
  Input,
  Label,
  Select,
  Spinner,
  Toggle,
  type SelectOption,
} from "@guided-review/ui";

export interface PublicSettings {
  provider: ProviderId;
  model: string;
  hasKey: boolean;
  last4: string | null;
  codingAgent: string | null;
  configPath: string;
}

export interface PublicAgent {
  id: string;
  displayName: string;
  provider: ProviderId;
  installed: boolean;
  usable: boolean;
  reason: string | null;
}

type ActionStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

function apiUrl(path: string, token: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("token", token);
  return url.toString();
}

function agentIdForProvider(provider: ProviderId): "claude-code" | "codex" | "grok" {
  switch (provider) {
    case "anthropic":
      return "claude-code";
    case "openai":
      return "codex";
    case "grok":
      return "grok";
  }
}

const CONFIGURE_PROVIDER_DOCS_URL = "https://guidedreview.dev/docs/configure-provider";

interface ProviderIconProps {
  provider: ProviderId;
  size?: number;
  className?: string;
}

function ProviderIcon({ provider, size = 16, className }: ProviderIconProps) {
  const def = getProvider(provider);
  return (
    <img
      src={`/${def.iconSrc}`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden="true"
      className={cn("shrink-0 object-contain", provider === "openai" && "invert", className)}
      style={{ width: size, height: size }}
    />
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width={16}
      height={16}
      className={cn("mt-0.5 shrink-0", className)}
      fill="none"
    >
      <path
        d="M8 1.75 14.25 13.25H1.75L8 1.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
    </svg>
  );
}

function OptionRow({ icon, label }: { icon: ProviderId; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ProviderIcon provider={icon} size={16} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function SubscriptionFields({ agent }: { agent: PublicAgent | undefined }) {
  return (
    <div className="flex flex-col gap-4" data-testid="subscription-help">
      <p
        role="note"
        className="m-0 flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm leading-relaxed text-foreground border-[color-mix(in_srgb,var(--color-warning)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-background))]"
      >
        <WarningIcon className="text-warning" />
        <span>
          This is unofficial and can break when the agent rotates a token, logs out, or stores a
          session that the provider API will not accept (Codex ChatGPT logins do not work). A
          console API key is the better option if you want the same review tomorrow.
        </span>
      </p>
      {agent && (
        <p
          role="status"
          data-testid="subscription-status"
          className={cn(
            "m-0 flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-base font-semibold",
            agent.usable
              ? "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface-raised))] text-foreground"
              : "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface-raised))] text-foreground",
          )}
        >
          <ProviderIcon provider={agent.provider} size={20} />
          <span>{agent.usable ? `${agent.displayName} is signed in.` : agent.reason}</span>
        </p>
      )}
    </div>
  );
}

function ApiKeyField({
  apiKey,
  last4,
  keyPlaceholder,
  configPath,
  busy,
  onChange,
}: {
  apiKey: string;
  last4: string | null;
  keyPlaceholder: string;
  configPath: string;
  busy: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="apiKey">API Key</Label>
      <Input
        id="apiKey"
        type="password"
        autoComplete="off"
        placeholder={last4 ? `Key ending in ···${last4}. Leave blank to keep it.` : keyPlaceholder}
        value={apiKey}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        aria-describedby="apiKey-hint"
      />
      <p id="apiKey-hint" className="mt-1.5 m-0 text-sm text-muted">
        Stored on this machine in{" "}
        <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-sm text-foreground">
          {configPath}
        </code>{" "}
        — never sent to Guided Review. A saved key always wins over a subscription.
      </p>
    </div>
  );
}

function agentForProvider(
  agents: PublicAgent[] | null,
  provider: ProviderId,
): PublicAgent | undefined {
  const id = agentIdForProvider(provider);
  return agents?.find((agent) => agent.id === id);
}

interface SettingsSnapshot {
  provider: ProviderId;
  model: string;
  useSubscription: boolean;
}

interface SettingsProps {
  token: string;
  onSaved?: (settings: PublicSettings) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function snapshotFromPublished(data: PublicSettings): SettingsSnapshot {
  return {
    provider: data.provider,
    model: data.model,
    useSubscription: Boolean(data.codingAgent),
  };
}

export function Settings({ token, onSaved, onDirtyChange }: SettingsProps) {
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState(defaultModelFor("anthropic"));
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [useSubscription, setUseSubscription] = useState(false);
  const [configPath, setConfigPath] = useState("~/.config/guided-review/config.json");
  const [agents, setAgents] = useState<PublicAgent[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<ActionStatus>({ kind: "idle" });
  const [connection, setConnection] = useState<ActionStatus>({ kind: "idle" });
  const [saved, setSaved] = useState<SettingsSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settingsRes, agentsRes] = await Promise.all([
          fetch(apiUrl("/api/settings", token)),
          fetch(apiUrl("/api/agents", token)),
        ]);
        if (!settingsRes.ok) throw new Error("Could not load settings.");
        const data = (await settingsRes.json()) as PublicSettings;
        const listed = agentsRes.ok
          ? ((await agentsRes.json()) as { agents: PublicAgent[] }).agents
          : [];
        if (cancelled) return;
        setProvider(data.provider);
        setModel(data.model);
        setHasKey(data.hasKey);
        setLast4(data.last4);
        setUseSubscription(Boolean(data.codingAgent));
        setConfigPath(data.configPath);
        setAgents(listed);
        setSaved(snapshotFromPublished(data));
        setLoaded(true);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not load settings.";
        setSaveStatus({ kind: "error", message });
        setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const busy = saveStatus.kind === "working" || connection.kind === "working";
  const providerDef = getProvider(provider);
  const subscriptionAgent = agentForProvider(agents, provider);
  const catalogModels = modelsForProvider(provider);
  const modelOptions: SelectOption[] = [
    ...(!catalogModels.some((m) => m.id === model)
      ? [
          {
            value: model,
            label: model,
            content: () => <OptionRow icon={provider} label={model} />,
          },
        ]
      : []),
    ...catalogModels.map((m) => ({
      value: m.id,
      label: m.displayName,
      content: () => <OptionRow icon={m.provider} label={m.displayName} />,
    })),
  ];

  const providerOptions: SelectOption<ProviderId>[] = PROVIDER_LIST.map((p) => ({
    value: p.id,
    label: p.displayName,
    content: () => <OptionRow icon={p.id} label={p.displayName} />,
  }));

  const applyPublished = (data: PublicSettings) => {
    setProvider(data.provider);
    setModel(data.model);
    setHasKey(data.hasKey);
    setLast4(data.last4);
    setUseSubscription(Boolean(data.codingAgent));
    setConfigPath(data.configPath);
    setApiKey("");
    setSaved(snapshotFromPublished(data));
    onSaved?.(data);
  };

  useEffect(() => {
    if (!loaded || !saved) {
      onDirtyChange?.(false);
      return;
    }
    onDirtyChange?.(
      provider !== saved.provider ||
        model !== saved.model ||
        useSubscription !== saved.useSubscription ||
        apiKey !== "",
    );
  }, [loaded, saved, provider, model, useSubscription, apiKey, onDirtyChange]);

  const payload = () => ({
    provider,
    model,
    ...(useSubscription
      ? { codingAgent: agentIdForProvider(provider) }
      : { codingAgent: null, ...(apiKey ? { apiKey } : {}) }),
  });

  const persist = async (): Promise<PublicSettings> => {
    const res = await fetch(apiUrl("/api/settings", token), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const data = (await res.json().catch(() => ({}))) as PublicSettings & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to save settings.");
    applyPublished(data);
    return data;
  };

  const onSave = async () => {
    setSaveStatus({ kind: "working" });
    setConnection({ kind: "idle" });
    try {
      await persist();
      setSaveStatus({ kind: "ok", message: "Saved" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings.";
      setSaveStatus({ kind: "error", message });
    }
  };

  const onTestConnection = async () => {
    setConnection({ kind: "working" });
    setSaveStatus({ kind: "idle" });
    try {
      const res = await fetch(apiUrl("/api/settings/test", token), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Connection test failed unexpectedly.");
      if (data.ok) {
        setConnection({ kind: "ok", message: "Connection OK" });
        const published = await fetch(apiUrl("/api/settings", token)).then(
          (r) => r.json() as Promise<PublicSettings>,
        );
        applyPublished(published);
      } else {
        setConnection({ kind: "error", message: data.error ?? "Connection failed." });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection test failed unexpectedly.";
      setConnection({ kind: "error", message });
    }
  };

  const onProviderChange = (next: ProviderId) => {
    setProvider(next);
    setModel(defaultModelFor(next));
    setSaveStatus({ kind: "idle" });
    setConnection({ kind: "idle" });
  };

  const canTest = useSubscription
    ? Boolean(subscriptionAgent?.usable || (hasKey && useSubscription))
    : Boolean(apiKey || (hasKey && last4));

  const subscriptionError =
    useSubscription && subscriptionAgent && !subscriptionAgent.usable
      ? subscriptionAgent.reason
      : null;

  const actionStatus =
    saveStatus.kind === "ok" || saveStatus.kind === "error"
      ? saveStatus
      : connection.kind === "ok" || connection.kind === "error"
        ? connection
        : null;

  // The subscription banner already shows the expired/unusable reason. Don't
  // repeat it as a second error under the actions after Test connection.
  const statusMessage =
    actionStatus &&
    !(
      actionStatus.kind === "error" &&
      subscriptionError &&
      actionStatus.message === subscriptionError
    )
      ? actionStatus
      : null;

  const agentName = subscriptionAgent?.displayName ?? "the matching coding agent";

  if (!loaded) return null;

  return (
    <main className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="m-0 font-brand text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-2 m-0 text-base leading-relaxed text-muted text-balance">
          Choose a provider and model. A console API key is the reliable path; a local subscription
          is a fallback.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Card
          title="AI Provider"
          titleId="ai-provider-heading"
          description={
            <>
              Claude, OpenAI, or Grok.{" "}
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
                value={provider}
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
                value={model}
                options={modelOptions}
                onChange={(value) => {
                  setModel(value);
                  setSaveStatus({ kind: "idle" });
                }}
                disabled={busy}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p
                  id="use-subscription-label"
                  className="m-0 font-brand text-base font-bold tracking-tight text-foreground"
                >
                  Use my subscription
                </p>
                <p id="use-subscription-hint" className="mt-1 m-0 text-sm text-muted">
                  Read the current login from {agentName} on this machine. The token stays in that
                  agent&apos;s store — Guided Review does not copy it into the config file.
                </p>
              </div>
              <Toggle
                id="use-subscription"
                checked={useSubscription}
                onChange={(enabled) => {
                  setUseSubscription(enabled);
                  if (enabled) setApiKey("");
                  setSaveStatus({ kind: "idle" });
                  setConnection({ kind: "idle" });
                }}
                disabled={busy}
                aria-labelledby="use-subscription-label"
                aria-describedby="use-subscription-hint"
              />
            </div>

            {useSubscription ? (
              <SubscriptionFields agent={subscriptionAgent} />
            ) : (
              <ApiKeyField
                apiKey={apiKey}
                last4={last4}
                keyPlaceholder={providerDef.keyPlaceholder}
                configPath={configPath}
                busy={busy}
                onChange={(value) => {
                  setApiKey(value);
                  setSaveStatus({ kind: "idle" });
                  setConnection({ kind: "idle" });
                }}
              />
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button onClick={() => void onSave()} disabled={busy}>
                {saveStatus.kind === "working" && <Spinner size={14} label="Saving" />}
                {saveStatus.kind === "working" ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onTestConnection()}
                disabled={!canTest || busy}
              >
                {connection.kind === "working" && <Spinner size={14} label="Testing connection" />}
                {connection.kind === "working" ? "Testing…" : "Test Connection"}
              </Button>
            </div>

            {statusMessage && <Callout kind={statusMessage.kind} message={statusMessage.message} />}

            <div className="divide-y divide-border border-t border-border">
              <HelpDetails title="How it works">
                <ol className="mt-0 mb-0 list-decimal space-y-1.5 pl-5">
                  <li>Pick a provider and model.</li>
                  <li>
                    Paste an API key from that provider&apos;s console, or turn on Use my
                    subscription to borrow the matching agent: Claude Code for Anthropic, Codex for
                    OpenAI, Grok for Grok.
                  </li>
                  <li>
                    Save. A key in the config file is used as-is. Subscription is only used when no
                    key is stored.
                  </li>
                </ol>
              </HelpDetails>
              <HelpDetails title="If it fails">
                <ul className="mt-0 mb-0 list-disc space-y-1.5 pl-5">
                  <li>
                    Confirm the matching CLI is installed and on your PATH:{" "}
                    <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-foreground">
                      claude
                    </code>
                    ,{" "}
                    <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-foreground">
                      codex
                    </code>
                    , or{" "}
                    <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-foreground">
                      grok
                    </code>
                    .
                  </li>
                  <li>Sign in to that agent again if the session expired.</li>
                  <li>
                    Codex must have an OpenAI API key — a ChatGPT login is not accepted by
                    api.openai.com.
                  </li>
                  <li>Then Save or Test connection. If it still fails, paste an API key.</li>
                </ul>
              </HelpDetails>
            </div>
          </div>
        </Card>
      </div>

      <p className="mt-6 m-0 text-sm leading-relaxed text-muted">
        Keys stay on this machine. Diffs go only to the provider you choose.
      </p>
    </main>
  );
}
