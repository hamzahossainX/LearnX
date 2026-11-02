import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkillRadarChart } from "@/components/skill-radar-chart";

describe("SkillRadarChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the 5 competency dimensions and card header", () => {
    const { container } = render(
      <SkillRadarChart
        totalMilestones={5}
        completedMilestoneIndices={[1, 2]}
      />
    );

    expect(screen.getByText("Skill Competency Matrix")).toBeInTheDocument();
    expect(screen.getByText("Pedagogical Growth Radar")).toBeInTheDocument();
    expect(screen.getAllByText("Fundamentals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Implementation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Architecture").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Problem Solving").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Security & Best Practices").length).toBeGreaterThan(0);

    const polygon = container.querySelector("polygon");
    expect(polygon).toBeInTheDocument();
    expect(polygon?.getAttribute("points")).toBeTruthy();
  });

  it("adjusts badges when security focus or speedrun mode is enabled", () => {
    const { rerender } = render(
      <SkillRadarChart
        totalMilestones={4}
        completedMilestoneIndices={[1, 2]}
        securityFocus={false}
        speedrunMode={false}
      />
    );

    expect(screen.queryByText(/Sec-Focus/)).toBeNull();
    expect(screen.queryByText(/Speedrun/)).toBeNull();

    rerender(
      <SkillRadarChart
        totalMilestones={4}
        completedMilestoneIndices={[1, 2]}
        securityFocus={true}
        speedrunMode={true}
      />
    );

    expect(screen.getByText(/Sec-Focus/)).toBeInTheDocument();
    expect(screen.getByText(/Speedrun/)).toBeInTheDocument();
  });

  it("renders default base values when no milestones are completed", () => {
    render(
      <SkillRadarChart
        totalMilestones={0}
        completedMilestoneIndices={[]}
      />
    );

    expect(screen.getByText("0/0")).toBeInTheDocument();
  });
});
