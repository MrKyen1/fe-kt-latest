import React, { useMemo } from "react";
import {
  Trophy,
  Award,
  RotateCcw,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Heart,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { AttemptReportSummary, StudentLeaderboardData } from "../../types/learning";
import { useAuth } from "../../contexts/AuthContext";
import { resolveMediaUrl } from "../../services/apiClient";

interface AttemptItem {
  id?: string;
  attemptNumber?: number;
  percentage?: string | number;
  attemptPercentage?: string | number;
  attemptCorrectCount?: number;
  attemptQuestionCount?: number;
  submittedAt?: string;
  isRedo?: boolean;
}

interface ExamResultReportProps {
  examTitle: string;
  studentName: string;
  studentCode?: string;
  studentAvatar?: string;
  isExamType: boolean;
  totalQuestions: number;
  reportSummary?: AttemptReportSummary | null;
  leaderboardData?: StudentLeaderboardData | null;
  leaderboardTotal?: number;
  historyAttempts: AttemptItem[];
  isReportLoading?: boolean;
  isLeaderboardLoading?: boolean;
  onReviewAnswers?: () => void;
  onRetryNewAttempt?: () => void;
  onBackToCourse?: () => void;
  canRetry?: boolean;
}

export const ExamResultReport: React.FC<ExamResultReportProps> = ({
  examTitle,
  studentName,
  studentCode,
  studentAvatar,
  isExamType,
  totalQuestions,
  reportSummary,
  leaderboardData,
  leaderboardTotal,
  historyAttempts,
  isReportLoading,
  isLeaderboardLoading,
  onReviewAnswers,
  onRetryNewAttempt,
  onBackToCourse,
  canRetry = true,
}) => {
  const { user } = useAuth();

  // Resolve real avatar URL
  const resolvedAvatarUrl = useMemo(() => {
    const raw =
      studentAvatar ||
      user?.avatar ||
      (user?.studentProfile as any)?.avatar ||
      (user?.student as any)?.avatar;
    if (!raw) return null;
    return resolveMediaUrl(raw);
  }, [studentAvatar, user]);

  // Compute fallback initials for avatar
  const studentInitials = useMemo(() => {
    const name = (studentName || user?.fullName || "HS").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [studentName, user?.fullName]);
  // Sort history attempts by attemptNumber descending for display or ascending
  const sortedAttempts = useMemo(() => {
    return [...historyAttempts].sort(
      (a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0)
    );
  }, [historyAttempts]);

  // Derived values from reportSummary
  const firstResult = reportSummary?.firstResult;
  const bestResult = reportSummary?.bestResult;
  const attemptsToMastery = reportSummary?.attemptsToMastery;

  // Fallback calculations if summary is not yet returned
  const fallbackFirst = sortedAttempts[0];
  const fallbackLast = sortedAttempts[sortedAttempts.length - 1];

  const firstCorrectDisplay =
    firstResult?.correctCount ??
    fallbackFirst?.attemptCorrectCount ??
    (fallbackFirst?.percentage != null
      ? Math.round((Number(fallbackFirst.percentage) / 100) * totalQuestions)
      : "—");

  const bestCorrectDisplay =
    bestResult?.correctCount ??
    (fallbackLast?.percentage != null
      ? Math.round((Number(fallbackLast.percentage) / 100) * totalQuestions)
      : totalQuestions);

  // Number of attempts to mastery: null -> "Chưa đạt 100%"
  const masteryDisplay =
    attemptsToMastery != null
      ? `${attemptsToMastery} lần`
      : reportSummary?.status === "finished"
        ? `${sortedAttempts.length} lần`
        : "Chưa đạt 100%";

  // Rank in class
  const viewerRank = leaderboardData?.viewer?.rank;
  const totalStudents = leaderboardTotal || leaderboardData?.entries?.length || 1;
  const rankDisplay = viewerRank ? `${viewerRank} / ${totalStudents}` : `1 / ${totalStudents}`;

  // Find the latest attempt (by submittedAt or attemptNumber) to show latest completion time
  const latestAttempt = useMemo(() => {
    if (!historyAttempts || historyAttempts.length === 0) return null;
    const sorted = [...historyAttempts].sort((a, b) => {
      const timeValA = a.submittedAt || (a as any).submitted_at;
      const timeValB = b.submittedAt || (b as any).submitted_at;
      const timeA = timeValA ? new Date(timeValA).getTime() : 0;
      const timeB = timeValB ? new Date(timeValB).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA; // most recent first
      return (b.attemptNumber || 0) - (a.attemptNumber || 0);
    });
    return sorted[0];
  }, [historyAttempts]);

  // Submitted time display: ALWAYS show the latest completion time
  const submittedTimeStr = useMemo(() => {
    const rawTime =
      latestAttempt?.submittedAt ||
      (latestAttempt as any)?.submitted_at ||
      fallbackLast?.submittedAt ||
      (fallbackLast as any)?.submitted_at ||
      bestResult?.submittedAt ||
      (bestResult as any)?.submitted_at ||
      firstResult?.submittedAt ||
      (firstResult as any)?.submitted_at ||
      new Date().toISOString();
    try {
      const d = new Date(rawTime);
      const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      return `${time}, ${date}`;
    } catch {
      return "Vừa xong";
    }
  }, [latestAttempt, fallbackLast, bestResult, firstResult]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6 pb-20 animate-fade-in">


      {/* ──────────────────────────────────────────────────────────
          2. MAIN CONTENT: 2-COLUMN DASHBOARD (REPORT + LEADERBOARD)
      ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        {/* ── LEFT COLUMN (7 COLS): BÁO CÁO KẾT QUẢ LÀM BÀI TẬP ── */}
        <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
          {/* Title Header */}
          <div className="bg-sky-600 text-white px-5 py-3.5 rounded-2xl shadow-sm flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-sky-200" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white m-0 uppercase">
              Báo cáo kết quả làm bài tập
            </h2>
          </div>

          {/* Student Profile & Exam Info Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 border-2 border-white shadow-sm p-0.5 flex items-center justify-center shrink-0 overflow-hidden relative">
                {resolvedAvatarUrl ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt={studentName || "Avatar học sinh"}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const fallback = document.getElementById("report-avatar-fallback");
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  id="report-avatar-fallback"
                  className={`w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 items-center justify-center text-white font-black text-xl sm:text-2xl shadow-inner select-none ${
                    resolvedAvatarUrl ? "hidden" : "flex"
                  }`}
                >
                  {studentInitials}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">Học sinh:</div>
                <div className="text-lg sm:text-xl font-black text-slate-900 truncate">
                  {studentName || "Học sinh Kata"}
                  {studentCode && (
                    <span className="text-xs text-slate-400 font-normal ml-2">({studentCode})</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate font-semibold">{examTitle}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Thời gian hoàn thành: {submittedTimeStr}</span>
                </div>
              </div>
            </div>

            {/* Big Golden Trophy */}
            <div className="hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-2xs shrink-0">
              <Trophy className="w-10 h-10 text-amber-500 fill-amber-400" />
              <div className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">Kata Cup</div>
            </div>
          </div>

          {/* 4 Stats Cards — Colorful Matching image2.png */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
            {/* Card 1: Kết quả lần 1 (Green) */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Kết quả lần 1</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-900">
                  {firstCorrectDisplay}
                </span>
                <span className="text-xs text-emerald-700 font-bold ml-1">/ {totalQuestions}</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">câu đúng</div>
            </div>

            {/* Card 2: Số lần làm để đúng hết (Blue) */}
            <div className="bg-sky-50/70 border-2 border-sky-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 text-sky-800 text-xs font-bold">
                <RotateCcw className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="truncate">Số lần làm</span>
              </div>
              <div className="my-1.5">
                <span className="text-lg sm:text-xl font-black text-sky-900 leading-tight">
                  {masteryDisplay}
                </span>
              </div>
              <div className="text-[11px] text-sky-700 font-medium">để đúng hết</div>
            </div>

            {/* Card 3: Kết quả tốt nhất (Orange) */}
            <div className="bg-amber-50/70 border-2 border-amber-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">Kết quả tốt nhất</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl sm:text-2xl font-black text-amber-900">
                  {bestCorrectDisplay}
                </span>
                <span className="text-xs text-amber-700 font-bold ml-1">/ {totalQuestions}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">câu đúng</div>
            </div>

            {/* Card 4: Xếp hạng trong lớp (Purple) */}
            <div className="bg-purple-50/70 border-2 border-purple-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 text-purple-800 text-xs font-bold">
                <Trophy className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Xếp hạng lớp</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl sm:text-2xl font-black text-purple-900">
                  {rankDisplay}
                </span>
              </div>
              <div className="text-[11px] text-purple-700 font-medium">học sinh</div>
            </div>
          </div>

          {/* Motivational Chibi Message Box */}
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-2xl shrink-0 border border-rose-200">
              👧
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-rose-600">Tuyệt vời!</span>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium m-0 mt-0.5 leading-relaxed">
                Bạn đã hoàn thành bài tập rất tốt. Hãy tiếp tục cố gắng nhé!
              </p>
            </div>
          </div>

          {/* Inline Attempt History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Lịch sử các lần làm bài
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {isReportLoading ? "Đang tải..." : `Tổng cộng: ${sortedAttempts.length} lượt`}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Lần làm</th>
                    <th className="py-2.5 px-3">Kết quả</th>
                    <th className="py-2.5 px-3">Tiến độ đề</th>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedAttempts.map((att, idx) => {
                    const pct = Number(att.percentage || att.attemptPercentage || 0);
                    const correctCount =
                      att.attemptCorrectCount ??
                      Math.round((pct / 100) * totalQuestions);

                    const timeStr = att.submittedAt
                      ? new Date(att.submittedAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })
                      : "—";

                    return (
                      <tr key={att.id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {att.attemptNumber || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">
                          {correctCount} / {totalQuestions}
                        </td>
                        <td className="py-2.5 px-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700 w-9 text-right">
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs whitespace-nowrap">
                          {timeStr}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Hoàn thành
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (5 COLS): BẢNG XẾP HẠNG TRONG LỚP ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Leaderboard Header */}
          <div className="bg-sky-600 text-white px-5 py-3.5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-300 fill-amber-300" />
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white m-0">
                Bảng xếp hạng trong lớp
              </h2>
            </div>
            <span className="text-xs font-bold bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white">
              Tổng số học sinh: {totalStudents}
            </span>
          </div>

          {/* Leaderboard Entries List / Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex-1 flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center">Hạng</th>
                    <th className="py-2.5 px-2.5">Học sinh</th>
                    <th className="py-2.5 px-2.5 text-center">Kết quả</th>
                    <th className="py-2.5 px-2.5 text-center">Số lần</th>
                    <th className="py-2.5 px-2.5 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLeaderboardLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Đang tải bảng xếp hạng...
                      </td>
                    </tr>
                  ) : leaderboardData?.entries && leaderboardData.entries.length > 0 ? (
                    leaderboardData.entries.map((entry) => {
                      const isMe = Boolean(entry.isMe);
                      const rank = entry.rank;
                      const hasResult = entry.bestResult && entry.status !== "not_started";

                      // Medal badges for top 3
                      const rankIcon =
                        rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-xs">
                            🥇
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs shadow-xs">
                            🥈
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs shadow-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="font-bold text-slate-600 text-xs px-2">{rank}</span>
                        );

                      return (
                        <tr
                          key={entry.student.id}
                          className={`transition ${isMe
                            ? "bg-amber-50/80 border-2 border-amber-300 font-bold rounded-xl"
                            : "hover:bg-slate-50/60"
                            }`}
                        >
                          {/* Rank */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {rankIcon}
                          </td>

                          {/* Student */}
                          <td className="py-2.5 px-2 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                {isMe && resolvedAvatarUrl ? (
                                  <img
                                    src={resolvedAvatarUrl}
                                    alt={entry.student.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (entry.student as any)?.avatar ? (
                                  <img
                                    src={resolveMediaUrl((entry.student as any).avatar)}
                                    alt={entry.student.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : isMe ? (
                                  <span className="text-[11px] font-bold text-amber-600">Me</span>
                                ) : (
                                  <span className="text-slate-500 text-[10px] font-bold">
                                    {(entry.student.fullName || "HS").slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`truncate text-xs sm:text-sm ${isMe ? "text-amber-900 font-black" : "text-slate-800 font-medium"
                                  }`}
                              >
                                {entry.student.fullName}
                              </span>
                            </div>
                          </td>

                          {/* Best Result */}
                          <td className="py-2.5 px-2 text-center font-bold whitespace-nowrap">
                            {hasResult && entry.bestResult ? (
                              <span className="text-emerald-700">
                                {entry.bestResult.correctCount} / {entry.bestResult.totalQuestions}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Attempts */}
                          <td className="py-2.5 px-2 text-center text-xs text-slate-600 whitespace-nowrap">
                            {hasResult ? `${entry.attemptsCount} lần` : "—"}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            {entry.status === "finished" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Đã hoàn thành
                              </span>
                            ) : entry.status === "in_progress" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                Đang làm
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                Chưa làm
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Chưa có bạn học nào làm bài
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          3. FOOTER ACTION BAR
      ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {onBackToCourse && (
          <button
            onClick={onBackToCourse}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
          >
            Quay lại khóa học
          </button>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {onReviewAnswers && (
            <button
              onClick={onReviewAnswers}
              className="px-5 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/80 font-bold text-sm hover:bg-indigo-100 transition flex items-center gap-1.5"
            >
              <span>Xem lại câu sai / đáp án</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {canRetry && onRetryNewAttempt && (
            <button
              onClick={onRetryNewAttempt}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-sm hover:brightness-105 shadow-sm transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ôn tập lại từ đầu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
