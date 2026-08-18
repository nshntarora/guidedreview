import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GeneratePromptModal } from "./GeneratePromptModal";

describe("GeneratePromptModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <GeneratePromptModal open={false} prompt="hello" onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the prompt and copies on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <GeneratePromptModal
        open
        prompt={"# Review feedback to apply\n\nFix this."}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Generate Prompt" })).toBeInTheDocument();
    expect(screen.getByTestId("generate-prompt-text")).toHaveTextContent("Fix this.");

    fireEvent.click(screen.getByTestId("generate-prompt-copy"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("# Review feedback to apply\n\nFix this.");
      expect(screen.getByTestId("generate-prompt-copy")).toHaveTextContent("Copied");
    });
  });

  it("wires copyActionRef and copies via that callback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const copyActionRef = { current: null as (() => void) | null };
    const prompt = ["# Review feedback to apply", "", "Fix this."].join("\n");

    render(
      <GeneratePromptModal open prompt={prompt} onClose={vi.fn()} copyActionRef={copyActionRef} />,
    );

    expect(copyActionRef.current).toEqual(expect.any(Function));
    copyActionRef.current?.();
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(prompt);
    });
  });

  it("does not claim Copied when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<GeneratePromptModal open prompt="prompt text" onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId("generate-prompt-copy"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("prompt text");
    });
    expect(screen.getByTestId("generate-prompt-copy")).toHaveTextContent("Copy");
    expect(screen.getByTestId("generate-prompt-copy")).not.toHaveTextContent("Copied");
  });

  it("calls onClose from Close and the X button", () => {
    const onClose = vi.fn();
    render(<GeneratePromptModal open prompt="prompt" onClose={onClose} />);

    fireEvent.click(screen.getByTestId("generate-prompt-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("generate-prompt-close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
