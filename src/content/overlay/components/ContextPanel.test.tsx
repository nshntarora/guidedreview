import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextPanel } from "./ContextPanel";

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

    expect(screen.getByText(/^error$/i)).toBeInTheDocument();
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
