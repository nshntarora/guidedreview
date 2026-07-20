import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextPanel, missingMetadataHint } from "./ContextPanel";

describe("missingMetadataHint", () => {
  it("mentions both title and description when neither is present", () => {
    expect(missingMetadataHint(false, false)).toMatch(/title or description/i);
    expect(missingMetadataHint(false, false)).toMatch(/AI/i);
  });

  it("mentions only description when the title is present", () => {
    const hint = missingMetadataHint(true, false);
    expect(hint).toMatch(/description/i);
    expect(hint).not.toMatch(/title/i);
    expect(hint).toMatch(/AI/i);
  });

  it("mentions only title when the description is present", () => {
    const hint = missingMetadataHint(false, true);
    expect(hint).toMatch(/title/i);
    expect(hint).toMatch(/AI/i);
  });
});

describe("ContextPanel error state", () => {
  it("renders status code, error code, message, and retry", () => {
    const onRetry = vi.fn();
    render(
      <ContextPanel
        unit={null}
        error={{
          message: "Rate limit exceeded",
          statusCode: 429,
          code: "rate_limit_error",
        }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByTestId("error-status-code")).toHaveTextContent("429");
    expect(screen.getByTestId("error-code")).toHaveTextContent("rate_limit_error");
    expect(screen.getByTestId("error-message")).toHaveTextContent("Rate limit exceeded");

    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: /^retry$/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits status/code rows when only a message is present", () => {
    render(
      <ContextPanel unit={null} error={{ message: "No API key configured." }} onRetry={vi.fn()} />,
    );
    expect(screen.queryByTestId("error-status-code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-code")).not.toBeInTheDocument();
    expect(screen.getByTestId("error-message")).toHaveTextContent("No API key configured.");
  });
});
