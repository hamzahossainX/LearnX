import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateFeynman } from "@/app/actions/evaluate-feynman";
import { FeynmanEvaluatorModal } from "@/components/feynman-evaluator-modal";

describe("evaluateFeynman Action", () => {
  it("rejects explanations shorter than 15 characters without calling APIs", async () => {
    const result = await evaluateFeynman({
      milestoneTitle: "Async/Await",
      milestoneDescription: "Understanding JavaScript promises and async functions.",
      userExplanation: "Too short",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("at least 15 characters");
  });

  it("returns fallback evaluation safely when AI environment keys are absent or fail", async () => {
    const result = await evaluateFeynman({
      milestoneTitle: "React Server Components",
      milestoneDescription: "Rendering components exclusively on the server.",
      userExplanation: "They render strictly on the server so you send zero JavaScript bundle to client browsers.",
    });

    expect(result.success).toBe(true);
    expect(typeof result.clarityScore).toBe("number");
    expect(result.clarityScore).toBeGreaterThanOrEqual(0);
    expect(result.whatYouNailed).toBeTruthy();
    expect(result.missingGap).toBeTruthy();
    expect(result.refinedAnalogy).toBeTruthy();
  });
});

describe("FeynmanEvaluatorModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders modal elements when milestone is provided", () => {
    render(
      <FeynmanEvaluatorModal
        milestone={{
          id: "m-1",
          title: "State Management in React",
          description: "Managing centralized UI state across child components.",
        }}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("Feynman Technique Evaluator")).toBeInTheDocument();
    expect(screen.getByText("State Management in React")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Think of a Promise like a restaurant buzzer/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Submit for Evaluation/i })
    ).toBeInTheDocument();
  });

  it("enforces minimum character count before submission", () => {
    render(
      <FeynmanEvaluatorModal
        milestone={{
          id: "m-1",
          title: "State Management in React",
          description: "Managing centralized UI state across child components.",
        }}
        onOpenChange={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Submit for Evaluation/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/restaurant buzzer/i);
    fireEvent.change(textarea, {
      target: { value: "State is like a shared whiteboard in an office room where anyone can see." },
    });

    expect(submitBtn).not.toBeDisabled();
  });
});
