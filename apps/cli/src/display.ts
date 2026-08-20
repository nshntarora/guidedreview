import { formatBanner, type CliStatus } from "./banner";

export type CliDisplay = {
  setStatus: (patch: Partial<CliStatus>) => void;
  close: () => void;
};

export function createCliDisplay(stream: NodeJS.WriteStream): CliDisplay {
  const tty = Boolean(stream.isTTY);
  const color = tty && !process.env.NO_COLOR;
  let status: CliStatus = {};
  let painted = false;
  let closed = false;
  let bannerLines = 0;

  function write(chunk: string): void {
    stream.write(chunk);
  }

  function paint(reset: boolean): void {
    const lines = formatBanner(status, { color }).split("\n");
    // Trailing spacer so logs do not sit against "last pull".
    bannerLines = lines.length + 1;

    if (!tty) {
      if (!painted) {
        write(`${lines.join("\n")}\n\n`);
        painted = true;
      }
      return;
    }

    if (reset || !painted) {
      write("\x1b[2J\x1b[H");
      for (const line of lines) write(`${line}\x1b[K\n`);
      write("\x1b[K\n");
      const rows = stream.rows ?? 24;
      const top = Math.min(bannerLines + 1, rows);
      write(`\x1b[${top};${rows}r`);
      write(`\x1b[${top};1H`);
      painted = true;
      return;
    }

    write("\x1b7");
    write("\x1b[H");
    for (const line of lines) write(`${line}\x1b[K\n`);
    write("\x1b[K");
    write("\x1b8");
  }

  function onResize(): void {
    if (closed || !painted) return;
    paint(true);
  }

  if (tty) stream.on("resize", onResize);

  return {
    setStatus(patch) {
      if (closed) return;
      status = { ...status, ...patch };
      paint(false);
    },
    close() {
      if (closed) return;
      closed = true;
      if (tty) {
        stream.off("resize", onResize);
        write("\x1b[r");
        write("\n");
      }
    },
  };
}
