import { afterEach, expect, it, vi } from "vitest";
import { createLocalReviewHost } from "./host";

const session = {
  sessionKey: "stable",
  legacySessionKey: "repo:base:branch:scope:oldhash",
  diffHash: "a".repeat(64),
};
const data = {
  diff: { files: [] },
  plan: null,
  prContext: null,
  pendingComposers: { file: { lines: [], body: "Keep this note" } },
};

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it("migrates legacy unstructured notes and restores a stale disk snapshot", async () => {
  sessionStorage.setItem(`guidedReview.session.${session.legacySessionKey}`, JSON.stringify(data));
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(null))
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetcher);
  const onStale = vi.fn();
  const host = createLocalReviewHost({ onConnectProvider() {}, onStale });
  host.configureSession(session);
  expect(await host.restoreSession(session.sessionKey)).toEqual(data);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ data, diffHash: session.diffHash });
  fetcher.mockResolvedValueOnce(Response.json({ data, diffHash: "b".repeat(64) }));
  expect(await host.restoreSession(session.sessionKey)).toEqual(data);
  expect(onStale).toHaveBeenCalledOnce();
});

it("retains failed saves, reports them, and retries before allowing a scope transition", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  const onPersistenceError = vi.fn();
  const host = createLocalReviewHost({ onConnectProvider() {}, onPersistenceError });
  host.configureSession(session);
  await expect(host.persistSession(session.sessionKey, data)).rejects.toThrow("Could not save");
  await expect(host.flushSessions()).rejects.toThrow();
  expect(onPersistenceError).toHaveBeenCalledWith(expect.stringContaining("Notes remain"));
  expect(sessionStorage.getItem(`guidedReview.session.${session.sessionKey}`)).toContain(
    "Keep this note",
  );
  fetcher.mockResolvedValue(Response.json({ ok: true }));
  await host.persistSession(session.sessionKey, data);
  await host.flushSessions();
  expect(sessionStorage.getItem(`guidedReview.session.${session.sessionKey}`)).toBeNull();
});

it("deletes after an in-flight save and suppresses autosave and unload during reset", async () => {
  let finishSave!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finishSave = resolve;
        }),
    )
    .mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetcher);
  const beacon = vi.fn();
  vi.stubGlobal("navigator", { sendBeacon: beacon });
  const host = createLocalReviewHost({ onConnectProvider() {} });
  host.configureSession(session);
  const saving = host.persistSession(session.sessionKey, data);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  // Coalesced old writes must not run after the delete, even on unload.
  const queued = host.persistSession(session.sessionKey, { ...data, planComplete: false });
  const resume = host.pausePersistence();
  const deleting = host.clearSession!(session.sessionKey);
  await host.persistSession(session.sessionKey, data);
  host.flushOnUnload();
  expect(beacon).not.toHaveBeenCalled();
  finishSave(Response.json({ ok: true }));
  await Promise.all([saving, queued, deleting]);
  resume();
  expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual(["PUT", "DELETE"]);
  expect(sessionStorage.getItem(`guidedReview.session.${session.sessionKey}`)).toBeNull();
  await host.flushSessions();
});

it("ignores stale metadata from a restore completed after configuring a different scope", async () => {
  let finishRestore!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finishRestore = resolve;
        }),
    ),
  );
  const onStale = vi.fn();
  const host = createLocalReviewHost({ onConnectProvider() {}, onStale });
  host.configureSession(session);
  const restoring = host.restoreSession(session.sessionKey);
  host.configureSession({ ...session, sessionKey: "another-scope" });
  finishRestore(Response.json({ data, diffHash: "b".repeat(64) }));
  expect(await restoring).toBeNull();
  expect(onStale).not.toHaveBeenCalled();
});
