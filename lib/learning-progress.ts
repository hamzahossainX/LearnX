type Milestone = { id: string; title: string; position: number; isCompleted: boolean };

export function getLearningProgress(milestones: Milestone[]) {
  const completed = milestones.filter((item) => item.isCompleted).length;
  const total = milestones.length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
    isComplete: total > 0 && completed === total,
    nextMilestone: [...milestones].sort((a, b) => a.position - b.position).find((item) => !item.isCompleted),
  };
}
