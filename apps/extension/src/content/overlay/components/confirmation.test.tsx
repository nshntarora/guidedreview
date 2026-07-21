import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConfirmationHost,
  confirm,
  confirmationHandlesKey,
  getConfirmationDialogElement,
  isConfirmationOpen,
  resetConfirmationQueueForTests,
  useConfirmationOpen,
} from "./confirmation";

function OpenProbe() {
  const open = useConfirmationOpen();
  return <span data-testid="open-probe">{open ? "open" : "closed"}</span>;
}

describe("confirmation", () => {
  beforeEach(() => {
    resetConfirmationQueueForTests();
  });

  afterEach(() => {
    resetConfirmationQueueForTests();
  });

  it("does not throw when confirm is called without a host", () => {
    expect(() => {
      confirm({
        title: "Orphan",
        body: "No host",
        okButtonHandler: () => {},
      });
    }).not.toThrow();
    expect(isConfirmationOpen()).toBe(true);
  });

  it("renders title and body when confirm is called with host mounted", async () => {
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Delete item",
        body: "This cannot be undone.",
        okButtonHandler: () => {},
      });
    });

    expect(await screen.findByTestId("confirmation-dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete item")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByTestId("confirmation-ok")).toHaveTextContent("Confirm");
    expect(screen.getByTestId("confirmation-cancel")).toHaveTextContent("Cancel");
  });

  it("renders ReactNode body and custom button labels", async () => {
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Custom",
        body: (
          <span data-testid="custom-body">
            Rich <strong>content</strong>
          </span>
        ),
        okButtonText: "Remove",
        cancelButtonText: "Keep",
        okButtonHandler: () => {},
      });
    });

    expect(await screen.findByTestId("custom-body")).toBeInTheDocument();
    expect(screen.getByTestId("confirmation-ok")).toHaveTextContent("Remove");
    expect(screen.getByTestId("confirmation-cancel")).toHaveTextContent("Keep");
  });

  it("sets destructive variant data attribute", async () => {
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Danger",
        body: "Really?",
        variant: "destructive",
        okButtonHandler: () => {},
      });
    });

    expect(await screen.findByTestId("confirmation-dialog")).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("focuses the cancel button on open", async () => {
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Focus",
        body: "Cancel first",
        okButtonHandler: () => {},
      });
    });

    await screen.findByTestId("confirmation-dialog");
    expect(screen.getByTestId("confirmation-cancel")).toHaveFocus();
  });

  it("calls okButtonHandler and closes on OK click", async () => {
    const user = userEvent.setup();
    const okButtonHandler = vi.fn();
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "OK test",
        body: "Proceed?",
        okButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");
    await user.click(screen.getByTestId("confirmation-ok"));

    await waitFor(() => {
      expect(okButtonHandler).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
    });
    expect(isConfirmationOpen()).toBe(false);
  });

  it("calls cancelButtonHandler and closes on Cancel click", async () => {
    const user = userEvent.setup();
    const cancelButtonHandler = vi.fn();
    const okButtonHandler = vi.fn();
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Cancel test",
        body: "Leave?",
        okButtonHandler,
        cancelButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");
    await user.click(screen.getByTestId("confirmation-cancel"));

    await waitFor(() => {
      expect(cancelButtonHandler).toHaveBeenCalledTimes(1);
      expect(okButtonHandler).not.toHaveBeenCalled();
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
    });
  });

  it("cancels when the scrim is clicked", async () => {
    const user = userEvent.setup();
    const cancelButtonHandler = vi.fn();
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Scrim",
        body: "Click outside",
        okButtonHandler: () => {},
        cancelButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");
    await user.click(screen.getByTestId("confirmation-scrim"));

    await waitFor(() => {
      expect(cancelButtonHandler).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
    });
  });

  it("shows Processing… while okButtonHandler is pending", async () => {
    const user = userEvent.setup();
    let resolveOk!: () => void;
    const okButtonHandler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveOk = resolve;
        }),
    );
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Slow",
        body: "Wait",
        okButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");
    await user.click(screen.getByTestId("confirmation-ok"));

    await waitFor(() => {
      expect(screen.getByTestId("confirmation-ok")).toHaveTextContent("Processing…");
      expect(screen.getByTestId("confirmation-ok")).toBeDisabled();
      expect(screen.getByTestId("confirmation-cancel")).toBeDisabled();
    });

    await act(async () => {
      resolveOk();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps the dialog open when okButtonHandler rejects", async () => {
    const user = userEvent.setup();
    const okButtonHandler = vi.fn().mockRejectedValue(new Error("Boom"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Fail",
        body: "Will throw",
        okButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");
    await user.click(screen.getByTestId("confirmation-ok"));

    await waitFor(() => {
      expect(okButtonHandler).toHaveBeenCalled();
    });
    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("confirmation-ok")).not.toBeDisabled();
    });

    consoleError.mockRestore();
  });

  it("handles Enter as OK and Escape as cancel via confirmationHandlesKey", async () => {
    const okButtonHandler = vi.fn();
    const cancelButtonHandler = vi.fn();
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Keys",
        body: "Keyboard",
        okButtonHandler,
        cancelButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");
    expect(getConfirmationDialogElement()).toBeInstanceOf(HTMLElement);

    act(() => {
      const handled = confirmationHandlesKey(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(handled).toBe(true);
    });

    await waitFor(() => {
      expect(cancelButtonHandler).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
    });

    act(() => {
      confirm({
        title: "Keys OK",
        body: "Enter",
        okButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");

    act(() => {
      const handled = confirmationHandlesKey(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(handled).toBe(true);
    });

    await waitFor(() => {
      expect(okButtonHandler).toHaveBeenCalledTimes(1);
    });
  });

  it("does not treat modifier+Enter as OK", async () => {
    const okButtonHandler = vi.fn();
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "Mod",
        body: "No",
        okButtonHandler,
      });
    });

    await screen.findByTestId("confirmation-dialog");

    act(() => {
      expect(
        confirmationHandlesKey(new KeyboardEvent("keydown", { key: "Enter", metaKey: true })),
      ).toBe(false);
      expect(
        confirmationHandlesKey(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true })),
      ).toBe(false);
    });

    expect(okButtonHandler).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();
  });

  it("useConfirmationOpen tracks queue state", async () => {
    render(
      <>
        <OpenProbe />
        <ConfirmationHost />
      </>,
    );

    expect(screen.getByTestId("open-probe")).toHaveTextContent("closed");

    act(() => {
      confirm({
        title: "Probe",
        body: "Open",
        okButtonHandler: () => {},
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("open-probe")).toHaveTextContent("open");
    });

    await userEvent.setup().click(screen.getByTestId("confirmation-cancel"));

    await waitFor(() => {
      expect(screen.getByTestId("open-probe")).toHaveTextContent("closed");
    });
  });

  it("shows the next queued confirmation after the first closes", async () => {
    const user = userEvent.setup();
    render(<ConfirmationHost />);

    act(() => {
      confirm({
        title: "First",
        body: "One",
        okButtonHandler: () => {},
      });
      confirm({
        title: "Second",
        body: "Two",
        okButtonHandler: () => {},
      });
    });

    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(screen.queryByText("Second")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("confirmation-cancel"));

    expect(await screen.findByText("Second")).toBeInTheDocument();
  });
});
