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
  bestPctVal: number;
  mastered: boolean;
  requiresRemediation: boolean;
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
      const examType: "exam" | "practice" = currentExam?.examType ?? ep.examType ?? "practice";
      const isExamType = examType === "exam";

      const pctVal = parseFloat(bestPct ?? "0");
      const mastered = ep.mastered ?? bestAttempt?.mastered ?? (pctVal >= 100);
      const requiresRemediation =
        ep.requiresRemediation ?? bestAttempt?.requiresRemediation ?? (!mastered && resolvedAttemptsCount >= 1);

      // Mastery Learning: Đề thi và Đề ôn tập đều chỉ hoàn thành khi đạt 100% hoặc mastered hoặc status finished
      const isCompleted =
        mastered ||
        pctVal >= 100 ||
        ep.status === "completed" ||
        ep.status === "finished" ||
        ep.status === "mastered";

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
        bestPctVal: pctVal,
        mastered,
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
  if (item.isExamType) {
    if (item.isCompleted) {
      return {
        label: "Đã hoàn thành (100%)",
        color: "green",
        badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
      };
    }
    if (item.requiresRemediation) {
      return {
        label: `Cần làm lại (${item.bestPctVal.toFixed(0)}%)`,
        color: "volcano",
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/60",
      };
    }
    if (item.attemptsCount > 0 || item.hasInProgress) {
      return {
        label: "Đang làm bài",
        color: "orange",
        badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/60",
      };
    }
    return {
      label: "Chưa làm bài",
      color: "default",
      badgeClass: "bg-slate-50 text-slate-600 border border-slate-200/60",
    };
  }

  // Chế độ Ôn tập (practice)
  if (item.isCompleted) {
    return {
      label: "Đã hoàn thành (100%)",
      color: "green",
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    };
  }
  if (item.requiresRemediation) {
    return {
      label: `Cần làm lại câu sai (${item.bestPctVal.toFixed(0)}%)`,
      color: "volcano",
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/60",
    };
  }
  if (item.attemptsCount > 0) {
    return {
      label: `Đang ôn tập (${item.bestPctVal.toFixed(0)}%)`,
      color: "orange",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/60",
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
 * Trả về thông tin nút hành động chuẩn hóa theo quy tắc nghiệp vụ:
 * 1. Đề kiểm tra (isExamType) đã hoàn thành -> KHÔNG cho làm lại, bắt buộc là "Xem bài làm" (review)
 * 2. Đề ôn tập (practice) đã hoàn thành -> Cho phép "Luyện lại" (retrain)
 * 3. Đề có câu sai cần làm lại (remediation) -> "Làm lại câu sai" (retry_wrong)
 * 4. Đang làm dở / chưa xong -> "Làm tiếp" (continue)
 * 5. Chưa làm -> "Làm ngay" (start)
 */
export function getAssignedExamAction(item: FlattenedAssignedExam): ExamActionDescriptor {
  if (item.isCompleted) {
    if (item.isExamType) {
      return {
        actionType: "review",
        label: "Xem bài làm",
        isPrimary: false,
      };
    } else {
      return {
        actionType: "retrain",
        label: "Luyện lại",
        isPrimary: false,
      };
    }
  }

  if (item.requiresRemediation) {
    return {
      actionType: "retry_wrong",
      label: "Làm lại câu sai",
      isPrimary: true,
    };
  }

  if (item.attemptsCount > 0 || item.hasInProgress) {
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
