import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

function ControlledSelect({
  initial = "a",
  onChange = vi.fn(),
}: {
  initial?: string;
  onChange?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <label id="fruit-label" htmlFor="fruit">
        Fruit
      </label>
      <Select
        id="fruit"
        aria-labelledby="fruit-label"
        value={value}
        options={OPTIONS}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
    </div>
  );
}

describe("Select", () => {
  it("renders the selected option label on the combobox", () => {
    render(<ControlledSelect />);
    expect(screen.getByRole("combobox", { name: /fruit/i })).toHaveTextContent("Alpha");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the listbox and selects an option on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSelect onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: /fruit/i }));
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");

    const listbox = screen.getByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "Beta" }));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("combobox")).toHaveTextContent("Beta");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation and Enter to select", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSelect onChange={onChange} />);

    const combobox = screen.getByRole("combobox", { name: /fruit/i });
    combobox.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("b");
    expect(combobox).toHaveTextContent("Beta");
  });

  it("closes on Escape without changing the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSelect onChange={onChange} />);

    const combobox = screen.getByRole("combobox", { name: /fruit/i });
    combobox.focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(combobox).toHaveTextContent("Alpha");
  });

  it("marks the selected option with aria-selected", async () => {
    const user = userEvent.setup();
    render(<ControlledSelect initial="c" />);

    await user.click(screen.getByRole("combobox"));
    const selected = screen.getByRole("option", { name: "Gamma" });
    expect(selected).toHaveAttribute("aria-selected", "true");
  });

  it("renders custom option content", async () => {
    const user = userEvent.setup();
    render(
      <Select
        aria-label="With icons"
        value="a"
        options={[
          {
            value: "a",
            label: "Alpha",
            content: () => (
              <span data-testid="custom-a">
                <span aria-hidden>★</span> Alpha
              </span>
            ),
          },
        ]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("custom-a")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    expect(within(screen.getByRole("listbox")).getByTestId("custom-a")).toBeInTheDocument();
  });
});
