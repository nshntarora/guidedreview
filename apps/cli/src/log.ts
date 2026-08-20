import { PassThrough } from "node:stream";
import winston from "winston";

const STDERR_LEVELS = ["error", "warn", "info", "http", "verbose", "debug", "silly"];

const ALLOWED_LEVELS = new Set(["error", "warn", "info", "debug"]);

export type LogLabel = "cli" | "http" | "session" | "settings" | "diff" | "plan" | "ui";

export type CapturedLog = {
  level: string;
  label?: string;
  message: string;
};

function resolveLevel(): string {
  const raw = process.env.GUIDED_REVIEW_LOG_LEVEL?.toLowerCase();
  if (raw && ALLOWED_LEVELS.has(raw)) return raw;
  return "info";
}

function consoleFormat(colorize: boolean): winston.Logform.Format {
  return winston.format.combine(
    winston.format.timestamp({ format: "HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    colorize ? winston.format.colorize({ level: true }) : winston.format.uncolorize(),
    winston.format.printf((info) => {
      const label = typeof info.label === "string" ? ` [${info.label}]` : "";
      const body = info.stack ?? info.message;
      return `${info.timestamp}  ${info.level}${label}  ${body}`;
    }),
  );
}

export function createLogger(options?: {
  silent?: boolean;
  transports?: winston.transport[];
}): winston.Logger {
  const colorize = Boolean(process.stderr.isTTY) && !options?.silent;
  return winston.createLogger({
    level: resolveLevel(),
    silent: options?.silent,
    format: consoleFormat(colorize),
    transports: options?.transports ?? [
      new winston.transports.Console({
        stderrLevels: STDERR_LEVELS,
      }),
    ],
  });
}

export function createCapturingLogger(): { logger: winston.Logger; records: CapturedLog[] } {
  const records: CapturedLog[] = [];
  const logger = winston.createLogger({
    level: "debug",
    format: winston.format.printf((info) => {
      records.push({
        level: String(info.level),
        label: typeof info.label === "string" ? info.label : undefined,
        message: String(info.message),
      });
      return "";
    }),
    transports: [new winston.transports.Stream({ stream: new PassThrough().resume() })],
  });
  return { logger, records };
}

export function labeled(logger: winston.Logger, label: LogLabel): winston.Logger {
  return logger.child({ label });
}
