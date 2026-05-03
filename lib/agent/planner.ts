export type PlannerResult = {
  plan: string[];
  answer: string;
};

export async function runPlanner(question: string): Promise<PlannerResult> {
  return {
    plan: [
      "Read the relevant plan window.",
      "Check recent runs and memory.",
      "Weigh volume, intensity, recovery, and race-goal risk."
    ],
    answer: `Planner scaffold received: ${question}`
  };
}
