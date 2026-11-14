import { CopyButton } from "@web/components/docs/CopyButton";
import type { CtaLocation } from "@web/lib/analytics";
import { CLI_INSTALL_COMMAND } from "@web/lib/links";

export function CliCommand({ location }: { location: CtaLocation }) {
  return (
    <div
      className="my-4 flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised p-4"
      data-testid={`cli-command-${location}`}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm">
        {CLI_INSTALL_COMMAND}
      </code>
      <CopyButton text={CLI_INSTALL_COMMAND} cliLocation={location} className="shrink-0" />
    </div>
  );
}
