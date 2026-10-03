import { ApiEnvelope, PaginationMeta } from "../types/api";
import {
  LeaderboardData,
  LeaderboardQuery,
  LeaderboardScopes,
  LeaderboardSummary,
  LeaderboardSummaryQuery,
} from "../types/learning";
import { apiClient, unwrapData } from "./apiClient";

function normalizeParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
  );
}

export const leaderboardService = {
  /**
   * Lấy bảng xếp hạng.
   * GET /api/v1/learning/leaderboard
   *
   * Mỗi lần gọi trả một bảng (chọn bằng `metric`).
   * Muốn hiển thị nhiều bảng song song → gọi nhiều lần song song.
   */
  async getLeaderboard(params: LeaderboardQuery): Promise<{
    data: LeaderboardData;
    meta: PaginationMeta;
  }> {
    const res = await apiClient.get<ApiEnvelope<LeaderboardData>>(
      "/learning/leaderboard",
      { params: normalizeParams(params as unknown as Record<string, unknown>) },
    );
    return {
      data: res.data.data,
      meta: res.data.meta as PaginationMeta,
    };
  },

  /**
   * Lấy danh sách phạm vi mà người dùng hiện tại được phép chọn.
   * GET /api/v1/learning/leaderboard/scopes
   *
   * Dùng để đổ vào bộ chọn scope (lớp / trung tâm / lộ trình...).
   */
  async getScopes(): Promise<LeaderboardScopes> {
    return unwrapData(
      await apiClient.get<ApiEnvelope<LeaderboardScopes>>(
        "/learning/leaderboard/scopes",
      ),
    );
  },

  /**
   * Lấy hạng cá nhân của người xem trên cả 3 bảng (mastery/accuracy/progress) trong 1 lời gọi.
   * GET /api/v1/learning/leaderboard/summary
   *
   * Dùng cho widget "Hạng của tôi" ở dashboard/profile học viên.
   * Trả null cho từng card nếu người xem là GV/admin.
   */
  async getSummary(params: LeaderboardSummaryQuery): Promise<LeaderboardSummary> {
    return unwrapData(
      await apiClient.get<ApiEnvelope<LeaderboardSummary>>(
        "/learning/leaderboard/summary",
        { params: normalizeParams(params as unknown as Record<string, unknown>) },
      ),
    );
  },
};
