type Check = (value: unknown) => boolean;
const str: Check = (v) => typeof v === "string";
const num: Check = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const bool: Check = (v) => typeof v === "boolean";
const one =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const array =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check);
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v);
const nullable =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const record =
  (check: Check): Check =>
  (v) =>
    object(v) && Object.values(v).every(check);
function object(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    object(v) &&
    Object.keys(v).every((key) => Object.hasOwn(fields, key)) &&
    Object.entries(fields).every(([key, check]) => check(v[key]));
const lineFields = {
  type: one("add", "del", "context"),
  content: str,
  oldLine: optional(num),
  newLine: optional(num),
};
const selection: Check = (v) =>
  shape({ kind: one("summary") })(v) ||
  shape({ kind: one("file"), path: str })(v) ||
  shape({ kind: one("unit"), id: str })(v);
const unit = shape({
  id: str,
  title: str,
  displayTitle: optional(str),
  kind: one("change", "tests"),
  context: str,
  files: array(
    shape({
      fileId: str,
      hunkIds: array(str),
      role: one(
        "schema_or_model",
        "core_logic",
        "consumer_or_call_site",
        "test",
        "config_or_generated",
      ),
    }),
  ),
});
// Explicit fields keep provider settings/credentials out of the persistence contract.
export const validSession: Check = shape({
  diff: shape({
    files: array(
      shape({
        path: str,
        previousPath: optional(str),
        status: one("added", "removed", "modified", "renamed"),
        isBinaryOrElided: bool,
        hunks: array(
          shape({
            id: str,
            header: str,
            oldStart: num,
            oldLines: num,
            newStart: num,
            newLines: num,
            lines: array(shape(lineFields)),
          }),
        ),
      }),
    ),
  }),
  plan: optional(nullable(shape({ units: array(unit) }))),
  planSource: optional(nullable(one("files", "ai"))),
  planComplete: optional(bool),
  prContext: nullable(
    shape({
      title: str,
      description: str,
      descriptionHtml: optional(str),
      baseRef: str,
      headRef: str,
      source: optional(one("local", "github")),
      owner: optional(str),
      repo: optional(str),
      number: optional(num),
      url: optional(str),
      author: optional(str),
    }),
  ),
  tokenUsage: optional(
    nullable(
      shape({ inputTokens: num, outputTokens: num, inputEstimated: bool, outputEstimated: bool }),
    ),
  ),
  currentUnitIndex: optional(num),
  currentFileIndex: optional(num),
  selection: optional(selection),
  navigationMode: optional(one("files", "units")),
  lastFileSelection: optional(nullable(selection)),
  lastUnitSelection: optional(nullable(selection)),
  collapsedDirectories: optional(record(bool)),
  scrollPositions: optional(record(num)),
  pendingComposers: optional(
    record(
      shape({
        body: str,
        lines: array(
          shape({
            ...lineFields,
            id: str,
            filePath: str,
            hunkId: str,
            lineIndex: num,
            side: one("LEFT", "RIGHT"),
          }),
        ),
      }),
    ),
  ),
  draftComments: optional(
    array(
      shape({
        id: str,
        filePath: str,
        side: one("LEFT", "RIGHT"),
        startLine: num,
        endLine: num,
        lineIds: array(str),
        selectedCode: optional(str),
        unresolved: optional(bool),
        body: str,
        unitId: optional(str),
      }),
    ),
  ),
});
