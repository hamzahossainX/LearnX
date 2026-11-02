import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LearningDashboard } from "@/components/learning/learning-dashboard";
import { getLearningProgress } from "@/lib/learning-progress";

afterEach(cleanup);
const milestones = [
  { id: "b", title: "Build a project", position: 2, isCompleted: false },
  { id: "a", title: "Learn basics", position: 1, isCompleted: true },
];
const roadmap = { id: "roadmap-1", title: "Learn Python", description: "A practical path", estimatedDuration: "3 weeks", updatedAt: new Date("2026-10-22T12:00:00Z"), milestones };

describe("My Learning", () => {
  it("calculates progress and finds the next milestone without mutating data", () => {
    expect(getLearningProgress(milestones)).toMatchObject({ completed: 1, total: 2, percent: 50, isComplete: false, nextMilestone: { id: "b" } });
    expect(milestones[0].id).toBe("b");
  });
  it("does not treat an empty roadmap as complete", () => {
    expect(getLearningProgress([])).toMatchObject({ percent: 0, isComplete: false, nextMilestone: undefined });
  });
  it("shows an actionable empty state", () => {
    render(<LearningDashboard roadmaps={[]} page={1} hasNextPage={false} />);
    expect(screen.getByRole("link", { name: "Create your first roadmap" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("links back to saved paths and exposes accessible progress", () => {
    render(<LearningDashboard roadmaps={[roadmap]} page={1} hasNextPage />);
    expect(screen.getByRole("link", { name: "Continue learning" })).toHaveAttribute("href", "/roadmap/roadmap-1");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/student?page=2");
  });
  it("offers review instead of continue for completed roadmaps", () => {
    render(<LearningDashboard roadmaps={[{ ...roadmap, milestones: milestones.map((item) => ({ ...item, isCompleted: true })) }]} page={1} hasNextPage={false} />);
    expect(screen.getByRole("link", { name: "Review" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Continue learning" })).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
