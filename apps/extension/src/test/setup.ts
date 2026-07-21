import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { createChromeMock } from "./chromeMock";

beforeEach(() => {
  (globalThis as unknown as { chrome: typeof chrome }).chrome =
    createChromeMock() as unknown as typeof chrome;
});

afterEach(() => {
  vi.restoreAllMocks();
});
