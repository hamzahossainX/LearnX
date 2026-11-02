import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuidedTour, GuidedTourLauncher, START_TOUR_EVENT } from "@/components/tour/guided-tour";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

describe("Guided Tour", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      bottom: 200,
      right: 300,
      width: 200,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));
  });

  afterEach(() => {
    cleanup();
    document.querySelectorAll("[data-tour]").forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it("renders the launcher button with accessible label and dispatches start event on click", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<GuidedTourLauncher />);

    const launcher = screen.getByRole("button", { name: "Start judge tour" });
    expect(launcher).toBeInTheDocument();
    expect(launcher).toHaveAttribute("title", expect.stringContaining("judge tour"));

    fireEvent.click(launcher);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: START_TOUR_EVENT }));
  });

  it("opens tour dialog when event fires and targets exist in DOM", () => {
    const targetElement = document.createElement("div");
    targetElement.setAttribute("data-tour", "hero");
    document.body.appendChild(targetElement);

    render(<GuidedTour />);
    fireEvent(window, new Event(START_TOUR_EVENT));

    const dialog = screen.getByRole("dialog", { name: "LearnX guided tour" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("One goal, one clear path")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close guided tour" });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog", { name: "LearnX guided tour" })).not.toBeInTheDocument();
  });

  it("advances to the next step when clicking Next and closes with finish", () => {
    const el1 = document.createElement("div");
    el1.setAttribute("data-tour", "hero");
    const el2 = document.createElement("div");
    el2.setAttribute("data-tour", "demo");
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    render(<GuidedTour />);
    fireEvent(window, new Event(START_TOUR_EVENT));

    expect(screen.getByText("One goal, one clear path")).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText("Demo-safe by design")).toBeInTheDocument();

    const finishBtn = screen.getByRole("button", { name: /Finish Tour/i });
    fireEvent.click(finishBtn);

    expect(screen.queryByRole("dialog", { name: "LearnX guided tour" })).not.toBeInTheDocument();
  });
});
