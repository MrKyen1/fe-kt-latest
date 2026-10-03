import { studentLearningService } from "../services/studentLearningService";

export interface FlattenedAssignedExam {
  id: string;
  assignmentStudentId: string;
  examId: string;
  examTitle: string;
  assignmentTitle: string;
  className?: string;
  examType: "exam" | "practice";
  isExamType: boolean;
  timeLimitSeconds?: number;
  attemptsCount: number;
  totalAttemptsCount: number;
  hasInProgress: boolean;
  bestPct?: string;
  bestScore?: string;
  maxScore?: string | number;
  bestPctVal: number;
  /** mastered = đã làm đúng 100% tất cả câu hỏi (từ backend) */
  mastered: boolean;
  /** isFinished = task đã "finished" theo backend (nộp lượt đầu) – không cần đạt 100% */
  isFinished: boolean;
  requiresRemediation: boolean;
  /** isCompleted = mastered hoặc đã finished — dùng để ẩn nút bắt đầu lần đầu */
  isCompleted: boolean;
  lastAttemptId?: string;
  currentExam?: any;
}

/**
 * Tải chi tiết và enrich từng assignment bằng examAssignments.get(id)
 */
export async function enrichExamAssignments(summaryList: any[]): Promise<any[]> {
  if (!summaryList || summaryList.length === 0) return [];

  const enriched = await Promise.allSettled(
    summaryList.map(async (item: any) => {
      try {
        const detail = await studentLearningService.examAssignments.get(item.id);
        return { ...item, ...detail };
      } catch {
        return item;
      }
    })
  );

  return enriched
    .map((r: any) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);
}

/**
 * Chuẩn hóa và làm phẳng danh sách bài thi từ examAssignments (Mastery Learning model)
 */
export function flattenAssignedExams(assignments: any[]): FlattenedAssignedExam[] {
  const list: FlattenedAssignedExam[] = [];

  assignments.forEach((row: any) => {
    const assignmentStudentId = row.id;
    const cls = row.class || row.assignment?.class;
    const assignmentTitle = row.assignment?.title || "Bài thi được giao";
    const className = cls?.name;
    const exams: any[] = row.exams || [];
    const exam = row.exam || row.assignment?.exam;
    const resolvedExams = exams.length > 0 ? exams : (exam ? [{
      examId: exam.id,
      exam,
      attemptsCount: row.summary?.attemptsCount ?? 0,
      bestPercentage: row.summary?.bestPercentage,
      status: (row.summary?.attemptsCount ?? 0) > 0 ? "in_progress" : "assigned",
    }] : []);

    resolvedExams.forEach((ep: any, idx: number) => {
      const currentExam = ep.exam;
      const examId = ep.examId || currentExam?.id;
      const examTitle = currentExam?.title || currentExam?.code || `Bài thi ${idx + 1}`;
      const attemptsCount = ep.attemptsCount ?? 0;
      const attemptsList = row.attempts || [];
      const examAttempts = attemptsList.filter(
        (att: any) => (att.examId === examId || !att.examId) && att.status === "submitted"
      );
      const inProgressAttempts = attemptsList.filter(
        (att: any) => (att.examId === examId || !att.examId) && att.status === "in_progress"
      );
      const hasInProgress =
        inProgressAttempts.length > 0 ||
        ep.status === "in_progress" ||
        ((row.summary?.attemptsCount ?? 0) > 0 && examAttempts.length === 0);
      const resolvedAttemptsCount = Math.max(attemptsCount, examAttempts.length);
      const totalAttemptsCount = Math.max(
        resolvedAttemptsCount,
        row.summary?.attemptsCount ?? 0,
        attemptsList.length
      );

      const bestAttempt = examAttempts.reduce((best: any, current: any) => {
        return !best || parseFloat(current.percentage) > parseFloat(best.percentage) ? current : best;
      }, null);

      const lastSubmittedAttempt = examAttempts.length > 0 ? examAttempts[examAttempts.length - 1] : null;
      const lastAttemptId = ep.lastAttemptId || lastSubmittedAttempt?.id || (inProgressAttempts.length > 0 ? inProgressAttempts[0].id : null);

      const bestPct = ep.bestPercentage || bestAttempt?.percentage;
      const bestScore = bestAttempt?.score;
      const maxScore =
        bestAttempt?.maxScore ??
        ep.firstAttemptResult?.maxScore ??
        currentExam?.questionsCount ??
        currentExam?.questionCount ??
        currentExam?.questions?.length;
      const examType: "exam" | "practice" = currentExam?.examType ?? ep.examType ?? "practice";
      const isExamType = examType === "exam";

      const pctVal = parseFloat(bestPct ?? "0");

      // Ưu tiên đọc mastered từ backend; fallback sang pctVal >= 100 nếu chưa có field
      const mastered = Boolean(ep.mastered ?? bestAttempt?.mastered ?? (pctVal >= 100));

      // isFinished: backend trả "finished" khi task hoàn tất (nộp lượt đầu với exam, hoặc đạt 100% với practice)
      const isFinished = ep.status === "finished" || ep.status === "mastered" || mastered;

      const requiresRemediation =
        ep.requiresRemediation ?? bestAttempt?.requiresRemediation ?? (!mastered && resolvedAttemptsCount >= 1);

      // isCompleted: mastered (100%) hoặc đã "finished" (task xong) – dùng để ẩn nút Làm ngay
      const isCompleted = mastered || pctVal >= 100 || isFinished;

      list.push({
        id: `${assignmentStudentId}_${examId}_${idx}`,
        assignmentStudentId,
        examId,
        examTitle,
        assignmentTitle,
        className,
        examType,
        isExamType,
        currentExam,
        timeLimitSeconds: currentExam?.timeLimitSeconds,
        attemptsCount: resolvedAttemptsCount,
        totalAttemptsCount,
        hasInProgress,
        bestPct,
        bestScore,
        maxScore,
        bestPctVal: pctVal,
        mastered,
        isFinished,
        requiresRemediation,
        isCompleted,
        lastAttemptId,
      });
    });
  });

  return list;
}

export interface ExamStatusDescriptor {
  label: string;
  color: string;
  badgeClass: string;
}

/**
 * Trả về thông tin trạng thái chuẩn hóa, không hardcode
 */
export function getAssignedExamStatus(item: FlattenedAssignedExam): ExamStatusDescriptor {
  // --- Đề kiểm tra (exam) ---
  if (item.isExamType) {
    if (item.mastered) {
      // Làm đúng 100% tất cả câu → hoàn thành
      return {
        label: "Đã hoàn thành",
        color: "green",
        badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
      };
    }
    if (item.isFinished) {
      // Đã nộp lượt đầu (finished) nhưng chưa đạt 100%
      return {
        label: "Đã nộp bài",
        color: "gold",
        badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/60",
      };
    }
    if (item.hasInProgress) {
      return {
        label: "Đang làm bài",
        color: "processing",
        badgeClass: "bg-blue-50 text-blue-700 border border-blue-200/60",
      };
    }
    return {
      label: "Chưa làm bài",
      color: "default",
      badgeClass: "bg-slate-50 text-slate-600 border border-slate-200/60",
    };
  }

  // --- Đề ôn tập (practice) ---
  if (item.mastered || item.isCompleted) {
    return {
      label: "Đã hoàn thành",
      color: "green",
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    };
  }
  if (item.requiresRemediation || item.attemptsCount > 0) {
    return {
      label: "Cần làm lại câu sai",
      color: "volcano",
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/60",
    };
  }
  if (item.hasInProgress) {
    return {
      label: "Đang làm dở",
      color: "processing",
      badgeClass: "bg-blue-50 text-blue-700 border border-blue-200/60",
    };
  }
  return {
    label: "Chưa ôn tập",
    color: "default",
    badgeClass: "bg-slate-50 text-slate-600 border border-slate-200/60",
  };
}

export interface ExamActionDescriptor {
  actionType: "review" | "retry_wrong" | "retrain" | "continue" | "start";
  label: string;
  isPrimary: boolean;
}

/**
 * Format điểm số: hiển thị số nguyên (1, 2, 3...) thay vì số thực (1.00, 2.00...)
 */
export function formatScore(score: any): string {
  if (score === undefined || score === null || score === "" || score === "-") return "—";
  if (typeof score === "string" && score.includes("/")) {
    return score.split("/").map((s) => formatScore(s.trim())).join(" / ");
  }
  const num = Number(score);
  if (isNaN(num)) return String(score);
  return num % 1 === 0 ? String(Math.trunc(num)) : String(num);
}

/**
 * Format phần trăm: hiển thị gọn gàng (ví dụ: 75% thay vì 75.00%, 87.5% thay vì 87.50%)
 */
export function formatPercentage(pct: any): string {
  if (pct === undefined || pct === null || pct === "" || pct === "-") return "—";
  const num = Number(pct);
  if (isNaN(num)) return String(pct);
  return num % 1 === 0 ? String(Math.trunc(num)) : num.toFixed(1);
}

/**
 * Trả về thông tin nút hành động theo quy tắc nghiệp vụ:
 * 1. mastered (100%) → "Xem bài làm" (chỉ xem, không cần làm thêm)
 * 2. Đã nộp / finished nhưng chưa 100% → "Làm lại câu sai" (cải thiện để đạt 100%)
 * 3. Đang làm dở → "Làm tiếp"
 * 4. Chưa làm → "Làm ngay"
 */
export function getAssignedExamAction(item: FlattenedAssignedExam): ExamActionDescriptor {
  // Đã đạt 100% → chỉ xem lại
  if (item.mastered) {
    return {
      actionType: "review",
      label: "Xem bài làm",
      isPrimary: false,
    };
  }

  // Đã nộp / finished nhưng chưa mastered → khuyến khích làm lại câu sai
  if (item.isFinished || item.requiresRemediation || item.attemptsCount > 0) {
    return {
      actionType: "retry_wrong",
      label: "Làm lại câu sai",
      isPrimary: true,
    };
  }

  // Đang làm dở
  if (item.hasInProgress) {
    return {
      actionType: "continue",
      label: "Làm tiếp",
      isPrimary: true,
    };
  }

  return {
    actionType: "start",
    label: "Làm ngay",
    isPrimary: true,
  };
}

export interface ExamScoreDisplay {
  primaryText: string;
  subText?: string;
  tooltip: string;
}

/**
 * Hiển thị điểm số theo mô hình Hướng 3 (Hybrid):
 * - Đề Kiểm tra (exam): Quy đổi về thang 10 chuẩn (VD: 10 đ, 8.5 đ). Subtext/Tooltip: đúng x/y câu.
 * - Đề Ôn tập (practice): Hiển thị số câu hoàn thành (VD: 4/4 câu, 32/35 câu). Tooltip: thành thạo/tiến độ.
 */
export function formatStudentExamScoreDisplay(options: {
  isExamType: boolean;
  score?: any;
  maxScore?: any;
  percentage?: any;
}): ExamScoreDisplay {
  const pct = parseFloat(String(options.percentage ?? "0"));
  const rawScore =
    options.score !== undefined && options.score !== null && options.score !== "" && options.score !== "—"
      ? Number(options.score)
      : null;
  const rawMax =
    options.maxScore !== undefined && options.maxScore !== null && options.maxScore !== "" && options.maxScore !== "—"
      ? Number(options.maxScore)
      : null;

  if (options.isExamType) {
    // --- BÀI KIỂM TRA: Quy đổi về Thang 10 ---
    // Điểm = (pct / 100) * 10 = pct / 10
    const score10 = Math.round((pct / 10) * 10) / 10;
    const formattedScore10 = Number.isInteger(score10) ? `${score10}` : score10.toFixed(1);

    const questionsText =
      rawScore !== null && rawMax !== null && rawMax > 0
        ? `${rawScore}/${rawMax} câu`
        : rawScore !== null
        ? `${rawScore} câu`
        : "";

    return {
      primaryText: `${formattedScore10} đ`,
      subText: questionsText,
      tooltip: questionsText
        ? `Điểm: ${formattedScore10} / 10 đ (Đúng ${questionsText} - ${pct.toFixed(0)}%)`
        : `Điểm: ${formattedScore10} / 10 đ (${pct.toFixed(0)}%)`,
    };
  } else {
    // --- BÀI ÔN TẬP: Hiển thị số câu hoàn thành / thành thạo ---
    const isMastered = pct >= 100;
    if (rawScore !== null && rawMax !== null && rawMax > 0) {
      return {
        primaryText: `${rawScore}/${rawMax} câu`,
        tooltip: isMastered
          ? `Đã hoàn thành xuất sắc toàn bộ ${rawScore}/${rawMax} câu (100% - Thành thạo)`
          : `Tiến độ ôn tập: Đúng ${rawScore}/${rawMax} câu (${pct.toFixed(0)}%)`,
      };
    } else if (rawScore !== null) {
      return {
        primaryText: `${rawScore} câu`,
        tooltip: isMastered
          ? `Đã làm đúng toàn bộ ${rawScore} câu (100% - Thành thạo)`
          : `Đã làm đúng ${rawScore} câu (${pct.toFixed(0)}%)`,
      };
    } else {
      return {
        primaryText: `${pct.toFixed(0)}%`,
        tooltip: isMastered ? "Đã hoàn thành 100% (Thành thạo)" : `Tiến độ ôn tập: ${pct.toFixed(0)}%`,
      };
    }
  }
}

