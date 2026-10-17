export function attemptReportMeta(response: { meta?: { total: number; page: number; limit: number; totalPages: number } | null }) {
  return response.meta ?? null;
}
