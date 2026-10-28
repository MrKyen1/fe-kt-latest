export function officialExamPercentage(progress: { firstAttemptResult?: { percentage?: string | number | null; score?: string | number; maxScore?: string | number } | null; [key: string]: unknown }): number | null {
  const result = progress.firstAttemptResult;
  if (!result) return null;
  if (result.percentage != null && result.percentage !== "") {
    const value = Number(result.percentage);
    return Number.isFinite(value) ? value : null;
  }
  const score = Number(result.score), max = Number(result.maxScore);
  return Number.isFinite(score) && max > 0 ? score / max * 100 : null;
}
