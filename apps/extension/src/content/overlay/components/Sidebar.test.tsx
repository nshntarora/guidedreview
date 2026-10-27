import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { createMemoryReviewHost, setActiveReviewHost } from "@guided-review/ui/review/host";
import { useReviewStore } from "@guided-review/ui/review/store";
import { Sidebar } from "@guided-review/ui/review/components/Sidebar";

beforeEach(() => {
  useReviewStore.setState(useReviewStore.getInitialState());
  Element.prototype.scrollIntoView = vi.fn();
});

it("opens provider setup from Review units, then offers explicit generation when settings are saved", () => {
  const connectProvider = vi.fn();
  const generatePlan = vi.fn();
  setActiveReviewHost(createMemoryReviewHost({ connectProvider }));
  useReviewStore.setState({
    diff: { files: [{ path: "src/a.ts", status: "added", hunks: [], isBinaryOrElided: false }] },
    status: "ready",
    needsProvider: true,
  });
  render(<Sidebar onGenerate={generatePlan} />);
  fireEvent.click(screen.getByTestId("review-plan-invitation-action"));
  expect(generatePlan).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("connect-provider-open-settings"));
  expect(connectProvider).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByTestId("navigation-tab-files"));
  fireEvent.click(screen.getByTestId("review-file-src/a.ts"));
  expect(screen.queryByTestId("connect-provider-prompt")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId("navigation-tab-units"));
  // Simulate the settings screen publishing readiness, without invoking a provider.
  fireEvent.click(screen.getByTestId("connect-provider-open-settings"));
  useReviewStore.getState().setProviderReady(true);
  // The async assertion flushes the store subscription update.
  return screen.findByTestId("generate-review-plan").then((button) => {
    expect(generatePlan).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(generatePlan).toHaveBeenCalledTimes(1);
  });
});
