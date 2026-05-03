export type EvalResult = {
  name: string;
  passed: boolean;
  details?: string;
};

export async function runEvals(evals: Array<() => Promise<EvalResult> | EvalResult>) {
  const results = [];
  for (const evaluate of evals) {
    results.push(await evaluate());
  }
  return results;
}
