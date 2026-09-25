import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  Tabs,
  Row,
  Col,
  Table,
  Tag,
  Input,
  Segmented,
  Spin,
  Popover,
  Progress,
  message,
  Button,
} from "antd";
import {
  BarChartOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  BookOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { teacherLearningService } from "../../../../services/teacherLearningService";
import { learningCmsService } from "../../../../services/learningCmsService";
import { getErrorMessage } from "../../../../services/apiClient";
import { TeacherAttemptDetailModal, formatDateTime, formatDuration } from "./TeacherAttemptDetailModal";
import { formatScore, formatPercentage } from "../../../../utils/studentExamUtils";

export function ExamAnalyticsModal({
  assignmentId,
  open,
  onClose,
}: {
  assignmentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [assignmentDetail, setAssignmentDetail] = useState<any>(null);
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [examDetailsMap, setExamDetailsMap] = useState<Record<string, any>>({});
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Filtering for student table
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("all");

  // Attempt detail modal
  const [detailAttemptId, setDetailAttemptId] = useState<string | null>(null);
  const [detailStudentName, setDetailStudentName] = useState<string>("");
  const [detailAttemptSummary, setDetailAttemptSummary] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) {
      setAnalyticsData(null);
      setAssignmentDetail(null);
      setAttemptsList([]);
      setExamDetailsMap({});
      setSelectedExamFilter("all");
      setActiveTab("overview");
      setStudentSearch("");
      setStudentStatusFilter("all");
      return;
    }

    setLoading(true);
    Promise.allSettled([
      teacherLearningService.examAssignments.analytics(assignmentId),
      teacherLearningService.examAssignments.get(assignmentId),
      teacherLearningService.examAssignments.attempts(assignmentId, { limit: 100 }),
    ])
      .then(([analyticsRes, detailRes, attemptsRes]) => {
        if (analyticsRes.status === "fulfilled") {
          setAnalyticsData(analyticsRes.value);
        }
        if (detailRes.status === "fulfilled") {
          const detail = detailRes.value;
          setAssignmentDetail(detail);

          // Fetch full questions for each exam in assignment to accurately map questions
          const exams = detail?.exams || [];
          const examIds: string[] = exams
            .map((e: any) => e.examId || e.exam?.id)
            .filter(Boolean);

          if (examIds.length > 0) {
            Promise.allSettled(
              examIds.map((id: string) => learningCmsService.exams.get(id)),
            ).then((results) => {
              const map: Record<string, any> = {};
              results.forEach((res, idx) => {
                if (res.status === "fulfilled" && res.value) {
                  map[examIds[idx]] = res.value;
                }
              });
              setExamDetailsMap(map);
            });
          }
        }
        if (attemptsRes.status === "fulfilled") {
          const list = (attemptsRes.value as any)?.data || attemptsRes.value || [];
          setAttemptsList(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => message.error(getErrorMessage(err, "Không thể tải analytics"), 5))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  // Distinguish Exam vs Practice based on examType
  const isExamType = useMemo(() => {
    if (assignmentDetail?.exams?.some((e: any) => e.exam?.examType === "exam")) return true;
    if (attemptsList?.some((a: any) => a.examType === "exam" || a.examTypeSnapshot === "exam")) return true;
    return false;
  }, [assignmentDetail, attemptsList]);

  // Aggregate student stats seamlessly
  const studentStats = useMemo(() => {
    if (analyticsData?.students && Array.isArray(analyticsData.students) && analyticsData.students.length > 0) {
      return analyticsData.students.map((s: any) => {
        const sAtts = attemptsList
          .filter((a: any) => a.studentId === s.studentId || a.assignmentStudentId === s.assignmentStudentId)
          .sort((a: any, b: any) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0));
        const submittedSAtts = sAtts.filter((a: any) => a.status === "submitted");
        const firstAttempt = submittedSAtts.find((a: any) => a.attemptNumber === 1) || submittedSAtts[0];

        const pcts = [
          ...submittedSAtts.map((a: any) => parseFloat(a.percentage ?? "0")),
          parseFloat(s.bestPercentage ?? s.bestScorePct ?? "0"),
        ].filter((n) => !isNaN(n));
        const bestPercentage = pcts.length > 0 ? Math.max(...pcts) : null;

        const scores = [
          ...submittedSAtts.map((a: any) => parseFloat(a.score ?? "0")),
          parseFloat(s.bestScore ?? "0"),
        ].filter((n) => !isNaN(n));
        const bestScore = scores.length > 0 ? Math.max(...scores) : s.bestScore;

        // Ưu tiên tin vào mastered từ backend; fallback sang tính từ percentage
        const isMastered =
          s.mastered === true ||
          (bestPercentage != null && bestPercentage >= 100);

        // Tin vào status từ backend; chỉ điều chỉnh khi rõ ràng mastered
        const computedStatus = isMastered
          ? "finished"
          : (s.status ?? (submittedSAtts.length > 0 ? "finished" : "assigned"));

        return {
          ...s,
          status: computedStatus,
          mastered: isMastered,
          bestPercentage,
          bestScore,
          allAttempts: sAtts,
          submittedAttempts: submittedSAtts,
          firstAttemptId: firstAttempt?.id || null,
          firstAttempt: firstAttempt || null,
          attemptsCount: submittedSAtts.length,
          hasInProgress: sAtts.some((a: any) => a.status === "in_progress"),
        };
      });
    }

    const assignedStudents = assignmentDetail?.students || [];
    const attemptsByStudent = new Map<string, any[]>();
    for (const att of attemptsList) {
      if (att.assignmentStudentId) {
        const arr = attemptsByStudent.get(att.assignmentStudentId) || [];
        arr.push(att);
        attemptsByStudent.set(att.assignmentStudentId, arr);
      }
      const sId = att.studentId || att.student?.id;
      if (sId) {
        const arr = attemptsByStudent.get(sId) || [];
        arr.push(att);
        attemptsByStudent.set(sId, arr);
      }
    }

    return assignedStudents.map((item: any) => {
      const student = item.student;
      const user = student?.user;
      const sId = item.studentId || student?.id;

      const attsByAssignId = attemptsByStudent.get(item.id) || [];
      const attsByStudentId = attemptsByStudent.get(sId) || [];
      const attsMap = new Map<string, any>();
      [...attsByAssignId, ...attsByStudentId].forEach((a) => attsMap.set(a.id, a));
      const atts = Array.from(attsMap.values()).sort(
        (a: any, b: any) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0),
      );

      const submittedAtts = atts.filter((a: any) => a.status === "submitted");
      const hasInProgress = atts.some((a: any) => a.status === "in_progress");
      const firstAttempt = submittedAtts.find((a: any) => a.attemptNumber === 1) || submittedAtts[0];
      const latest = submittedAtts[submittedAtts.length - 1] || atts[atts.length - 1];

      const scores = submittedAtts.map((a: any) => Number(a.score)).filter((n) => !isNaN(n));
      const pcts = submittedAtts.map((a: any) => Number(a.percentage)).filter((n) => !isNaN(n));
      const bestScore = scores.length > 0 ? Math.max(...scores) : null;
      const bestPercentage = pcts.length > 0 ? Math.max(...pcts) : null;

      // Ưu tiên mastered từ backend (item.mastered), fallback sang percentage
      const isMastered =
        item.mastered === true ||
        (bestPercentage != null && bestPercentage >= 100);

      // isFinished: backend đã nộp lượt đầu (finished) dù chưa 100%
      const isFinished = item.status === "finished" || isMastered;

      // computedStatus: tin vào backend, chỉ điều chỉnh khi mastered
      let computedStatus = item.status ?? "assigned";
      if (isMastered) computedStatus = "finished";

      return {
        studentId: sId,
        assignmentStudentId: item.id,
        code: user?.code || student?.code || "—",
        fullName: user?.fullName || student?.fullName || "Học sinh",
        email: user?.email || student?.email || "—",
        status: computedStatus,
        mastered: isMastered,
        isFinished,
        latestAttemptStatus: item.latestAttemptStatus ?? null,
        masteredExamsCount: item.masteredExamsCount ?? null,
        totalRequiredExamsCount: item.totalRequiredExamsCount ?? null,
        attemptsCount: submittedAtts.length,
        firstAttemptId: firstAttempt?.id || null,
        firstAttempt: firstAttempt || null,
        latestAttemptId: latest?.id || null,
        latestAttempt: latest || null,
        bestScore,
        bestPercentage,
        allAttempts: atts,
        submittedAttempts: submittedAtts,
        hasInProgress,
      };
    });
  }, [analyticsData, assignmentDetail, attemptsList, isExamType]);

  const totalAssigned = studentStats.length;
  // mastered = đã hoàn thành 100%
  const totalMastered = studentStats.filter((s: any) => s.mastered === true).length;
  // finished (có thể bao gồm mastered): đã nộp bài, task done
  const totalFinished = studentStats.filter((s: any) => s.status === "finished").length;
  // đã nộp nhưng chưa mastered
  const totalSubmittedOnly = totalFinished - totalMastered;
  const totalInProgress = studentStats.filter(
    (s: any) => s.status === "in_progress" || s.hasInProgress,
  ).length;
  const totalNotStarted = studentStats.filter(
    (s: any) => s.attemptsCount === 0 && s.status === "assigned",
  ).length;
  const completionRate = totalAssigned > 0 ? Math.round((totalMastered / totalAssigned) * 100) : 0;

  const filteredStudents = useMemo(() => {
    return studentStats.filter((s: any) => {
      if (studentStatusFilter !== "all") {
        if (studentStatusFilter === "finished" && s.status !== "finished") return false;
        if (studentStatusFilter === "in_progress" && (s.status === "finished" || s.attemptsCount === 0)) return false;
        if (studentStatusFilter === "not_started" && (s.attemptsCount > 0 || s.status !== "assigned")) return false;
      }
      if (studentSearch.trim()) {
        const kw = studentSearch.toLowerCase();
        const nameMatch = (s.fullName || "").toLowerCase().includes(kw);
        const codeMatch = (s.code || "").toLowerCase().includes(kw);
        const emailMatch = (s.email || "").toLowerCase().includes(kw);
        if (!nameMatch && !codeMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [studentStats, studentStatusFilter, studentSearch, isExamType]);

  // Map each questionId to its exam metadata
  const questionToExamMap = useMemo(() => {
    const map: Record<
      string,
      { examId: string; examTitle: string; examCode: string; examType: string; orderIndex?: number }
    > = {};

    Object.values(examDetailsMap).forEach((ex: any) => {
      if (!ex) return;
      const examId = ex.id;
      const examTitle = ex.title || ex.code || `Đề ${examId.substring(0, 6)}`;
      const examCode = ex.code || "";
      const examType = ex.examType || "exam";
      const questions =
        ex.questions ||
        ex.examQuestions?.map((eq: any) => eq.question || { id: eq.questionId, orderIndex: eq.orderIndex }) ||
        [];
      questions.forEach((q: any, idx: number) => {
        const qId = q.id || q.questionId;
        if (qId) {
          map[qId] = {
            examId,
            examTitle,
            examCode,
            examType,
            orderIndex: q.orderIndex != null ? q.orderIndex : idx,
          };
        }
      });
    });

    (assignmentDetail?.exams || []).forEach((e: any) => {
      const ex = e.exam || {};
      const examId = e.examId || ex.id;
      const examTitle = ex.title || ex.code || e.title || e.code || examId;
      const examCode = ex.code || e.code || "";
      const examType = ex.examType || "exam";
      const questions =
        ex.questions ||
        ex.examQuestions?.map((eq: any) => eq.question || { id: eq.questionId, orderIndex: eq.orderIndex }) ||
        [];
      questions.forEach((q: any, idx: number) => {
        const qId = q.id || q.questionId;
        if (qId && !map[qId]) {
          map[qId] = {
            examId,
            examTitle,
            examCode,
            examType,
            orderIndex: q.orderIndex != null ? q.orderIndex : idx,
          };
        }
      });
    });

    attemptsList.forEach((att: any) => {
      const attExamId = att.examId || att.exam?.id;
      if (!attExamId) return;
      const answers = att.answers || att.attemptAnswers || [];
      answers.forEach((ans: any) => {
        const qId = ans.questionId || ans.question?.id;
        if (qId && !map[qId]) {
          const ex =
            assignmentDetail?.exams?.find((e: any) => (e.examId || e.exam?.id) === attExamId)?.exam ||
            att.exam ||
            {};
          map[qId] = {
            examId: attExamId,
            examTitle: ex.title || ex.code || att.examTitle || `Đề ${attExamId.substring(0, 6)}`,
            examCode: ex.code || att.examCode || "",
            examType: ex.examType || att.examType || "exam",
          };
        }
      });
    });

    return map;
  }, [examDetailsMap, assignmentDetail, attemptsList]);

  // Group questions by Exam
  const questionGroups = useMemo(() => {
    const list: any[] = analyticsData?.perQuestion || [];
    const assignmentExams = assignmentDetail?.exams || [];

    const examMetaList = assignmentExams.map((e: any, idx: number) => {
      const ex = e.exam || {};
      const id = e.examId || ex.id || `exam_${idx}`;
      return {
        examId: id,
        examTitle: ex.title || ex.code || e.title || e.code || `Đề ${idx + 1}`,
        examCode: ex.code || e.code || "",
        examType: ex.examType || "exam",
      };
    });

    const groupMap = new Map<
      string,
      {
        examId: string;
        examTitle: string;
        examCode: string;
        examType: string;
        questions: any[];
      }
    >();

    examMetaList.forEach((em: any) => {
      groupMap.set(em.examId, {
        ...em,
        questions: [],
      });
    });

    const unassignedQuestions: any[] = [];

    list.forEach((item: any, idx: number) => {
      const qId = item.questionId;
      const mapped = qId ? questionToExamMap[qId] : null;
      const itemExamId = item.examId || item.exam_id || item.exam?.id || mapped?.examId;

      if (itemExamId && groupMap.has(itemExamId)) {
        groupMap.get(itemExamId)!.questions.push({
          ...item,
          examId: itemExamId,
          examTitle: groupMap.get(itemExamId)!.examTitle,
          examCode: groupMap.get(itemExamId)!.examCode,
          orderIndex: mapped?.orderIndex ?? item.orderIndex ?? idx,
        });
      } else if (itemExamId) {
        const title = mapped?.examTitle || `Đề ${itemExamId.substring(0, 6)}`;
        if (!groupMap.has(itemExamId)) {
          groupMap.set(itemExamId, {
            examId: itemExamId,
            examTitle: title,
            examCode: mapped?.examCode || "",
            examType: mapped?.examType || "exam",
            questions: [],
          });
        }
        groupMap.get(itemExamId)!.questions.push({
          ...item,
          examId: itemExamId,
          examTitle: title,
          examCode: mapped?.examCode || "",
          orderIndex: mapped?.orderIndex ?? item.orderIndex ?? idx,
        });
      } else {
        unassignedQuestions.push({
          ...item,
          orderIndex: item.orderIndex ?? idx,
        });
      }
    });

    // Fallback heuristic if question couldn't be matched by ID
    if (unassignedQuestions.length > 0) {
      if (examMetaList.length === 1) {
        const target = examMetaList[0];
        unassignedQuestions.forEach((q) => {
          groupMap.get(target.examId)?.questions.push({
            ...q,
            examId: target.examId,
            examTitle: target.examTitle,
            examCode: target.examCode,
          });
        });
        unassignedQuestions.length = 0;
      } else if (examMetaList.length > 1) {
        const seenIndices = new Set<number>();
        let currentBucket = 0;
        unassignedQuestions.forEach((q, qIdx) => {
          const oIdx = q.orderIndex ?? qIdx;
          if (seenIndices.has(oIdx)) {
            currentBucket = (currentBucket + 1) % examMetaList.length;
            seenIndices.clear();
          }
          seenIndices.add(oIdx);
          const target = examMetaList[currentBucket] || examMetaList[0];
          groupMap.get(target.examId)?.questions.push({
            ...q,
            examId: target.examId,
            examTitle: target.examTitle,
            examCode: target.examCode,
          });
        });
        unassignedQuestions.length = 0;
      }
    }

    const result: Array<{
      examId: string;
      examTitle: string;
      examCode: string;
      examType: string;
      questions: any[];
    }> = [];

    Array.from(groupMap.values()).forEach((grp) => {
      if (grp.questions.length > 0 || examMetaList.length > 0) {
        const sorted = [...grp.questions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        const numbered = sorted.map((q, localIdx) => ({
          ...q,
          displayIndex: localIdx + 1,
          displayPrompt: q.prompt || `Câu hỏi ${localIdx + 1}`,
        }));
        result.push({
          ...grp,
          questions: numbered,
        });
      }
    });

    if (unassignedQuestions.length > 0) {
      result.push({
        examId: "__other__",
        examTitle: "Câu hỏi khác",
        examCode: "",
        examType: "exam",
        questions: unassignedQuestions.map((q, localIdx) => ({
          ...q,
          displayIndex: localIdx + 1,
          displayPrompt: q.prompt || `Câu hỏi ${localIdx + 1}`,
        })),
      });
    }

    return result;
  }, [analyticsData, assignmentDetail, questionToExamMap]);

  const totalQuestionCount = useMemo(() => {
    return questionGroups.reduce((acc, g) => acc + g.questions.length, 0);
  }, [questionGroups]);

  const filteredQuestionGroups = useMemo(() => {
    if (selectedExamFilter === "all") return questionGroups;
    return questionGroups.filter((g) => g.examId === selectedExamFilter);
  }, [questionGroups, selectedExamFilter]);

  // Map assigned students and their specific progress per exam
  const examStudentAssignments = useMemo(() => {
    return questionGroups.map((group) => {
      const examId = group.examId;
      const students = studentStats.map((st: any) => {
        // Find all attempts by this student for this specific exam
        const examAtts = (st.allAttempts || [])
          .filter((a: any) => (a.examId || a.exam?.id) === examId)
          .sort((a: any, b: any) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0));

        const submitted = examAtts.filter((a: any) => a.status === "submitted");
        const inProgress = examAtts.some((a: any) => a.status === "in_progress");
        const firstAtt = submitted.find((a: any) => a.attemptNumber === 1) || submitted[0];
        const latestAtt = submitted[submitted.length - 1];

        const scores = submitted.map((a: any) => Number(a.score)).filter((n: any) => !isNaN(n));
        const pcts = submitted.map((a: any) => Number(a.percentage)).filter((n: any) => !isNaN(n));
        const bestPct = pcts.length > 0 ? Math.max(...pcts) : null;
        const bestScore = scores.length > 0 ? Math.max(...scores) : null;

        // Tin vào mastered từ studentStats (sử dụng st.mastered nếu có, fallback sang bestPct)
        const stMastered = (st as any).mastered === true;
        let examStatus: "finished" | "submitted" | "in_progress" | "not_started" = "not_started";
        if (
          stMastered ||
          bestPct === 100 ||
          submitted.some((a: any) => a.mastered === true || Number(a.percentage) >= 100)
        ) {
          examStatus = "finished"; // finished = mastered 100%
        } else if (submitted.length > 0) {
          examStatus = "submitted"; // submitted = đã nộp nhưng chưa 100%
        } else if (inProgress) {
          examStatus = "in_progress";
        }

        return {
          studentId: st.studentId,
          fullName: st.fullName,
          code: st.code,
          attemptsCount: submitted.length,
          hasInProgress: inProgress,
          firstAttempt: firstAtt,
          latestAttempt: latestAtt,
          bestScore,
          bestPercentage: bestPct,
          examStatus,
        };
      });

      return {
        ...group,
        students,
      };
    });
  }, [questionGroups, studentStats]);

  const handleOpenAttemptDetail = (row: any) => {
    const attemptId = row.firstAttemptId || row.latestAttemptId;
    if (!attemptId) {
      message.info("Học sinh này chưa có lượt làm bài nào");
      return;
    }
    setDetailAttemptId(attemptId);
    setDetailStudentName(row.fullName);
    setDetailAttemptSummary(row.firstAttempt || row.latestAttempt);
    setDetailModalOpen(true);
  };

  const handleOpenAttemptDetailById = (attemptId: string, studentName: string, attemptObj: any) => {
    setDetailAttemptId(attemptId);
    setDetailStudentName(studentName);
    setDetailAttemptSummary(attemptObj);
    setDetailModalOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        maskClosable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BarChartOutlined className="text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-800">Thống kê bài thi được giao</span>
                {isExamType ? (
                  <span className="inline-flex items-center text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                    Đề kiểm tra (Cần đạt 100%)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    Đề ôn tập (Làm lại tới khi 100%)
                  </span>
                )}
              </div>
              {assignmentDetail?.title && (
                <div className="text-xs font-normal text-slate-500 mt-0.5">
                  Đợt giao: <span className="font-medium text-slate-700">{assignmentDetail.title}</span>
                </div>
              )}
            </div>
          </div>
        }
        width={960}
        className="rounded-3xl overflow-hidden"
        styles={{ body: { maxHeight: "74vh", overflowY: "auto", padding: "16px 24px" } }}
      >
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <Spin size="large" />
            <span className="text-slate-400 text-sm mt-3">Đang phân tích dữ liệu bài thi...</span>
          </div>
        ) : (
          <div>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="mt-2"
              items={[
                // ========== TAB 1: OVERVIEW & QUESTIONS ==========
                {
                  key: "overview",
                  label: (
                    <span className="flex items-center gap-2 px-1 font-semibold">
                      <BarChartOutlined />
                      <span>Tổng quan & Câu hỏi</span>
                    </span>
                  ),
                  children: (
                    <div className="space-y-4 pt-2">
                      {/* KPI Cards Row 1: 4 cards */}
                      <Row gutter={[12, 12]}>
                        <Col span={6}>
                          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1.5">
                              <span>Học sinh được giao</span>
                              <TeamOutlined className="text-slate-400 text-sm" />
                            </div>
                            <div className="text-2xl font-bold tracking-tight text-slate-800">
                              {totalAssigned}
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 shadow-2xs hover:border-emerald-200 transition-all">
                            <div className="flex items-center justify-between text-xs font-medium text-emerald-700 mb-1.5">
                              <span>Hoàn thành 100%</span>
                              <CheckCircleOutlined
                                className={totalMastered > 0 ? "text-emerald-500 text-sm" : "text-slate-400 text-sm"}
                              />
                            </div>
                            <div
                              className={`text-2xl font-bold tracking-tight ${
                                totalMastered > 0 ? "text-emerald-600" : "text-slate-800"
                              }`}
                            >
                              {totalMastered}
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 shadow-2xs hover:border-amber-200 transition-all">
                            <div className="flex items-center justify-between text-xs font-medium text-amber-700 mb-1.5">
                              <span>Đã nộp bài</span>
                              <ClockCircleOutlined
                                className={totalSubmittedOnly > 0 ? "text-amber-500 text-sm" : "text-slate-400 text-sm"}
                              />
                            </div>
                            <div
                              className={`text-2xl font-bold tracking-tight ${
                                totalSubmittedOnly > 0 ? "text-amber-600" : "text-slate-800"
                              }`}
                            >
                              {totalSubmittedOnly}
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1.5">
                              <span>Tỷ lệ thành thạo</span>
                              <TrophyOutlined className="text-slate-400 text-sm" />
                            </div>
                            <div className="text-2xl font-bold tracking-tight text-slate-800">
                              {completionRate}%
                            </div>
                          </div>
                        </Col>
                      </Row>

                      {/* Score Metrics Row 2: 2 cards with identical layout and font sizes */}
                      <Row gutter={[12, 12]}>
                        <Col span={12}>
                          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all">
                            <div className="text-xs font-medium text-slate-500 mb-1.5">
                              Điểm trung bình
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                                {analyticsData?.averageScore != null ? analyticsData.averageScore.toFixed(2) : "—"}
                              </span>
                              <span className="text-xs font-normal text-slate-400">
                                ({analyticsData?.averagePercentage != null ? analyticsData.averagePercentage.toFixed(1) : "—"}%)
                              </span>
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all">
                            <div className="text-xs font-medium text-slate-500 mb-1.5">
                              Điểm cao nhất
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                                {analyticsData?.bestScore != null ? analyticsData.bestScore.toFixed(2) : "—"}
                              </span>
                              <span className="text-xs font-normal text-slate-400">
                                ({analyticsData?.bestPercentage != null ? analyticsData.bestPercentage.toFixed(1) : "—"}%)
                              </span>
                            </div>
                          </div>
                        </Col>
                      </Row>

                      {/* Overview: Assigned Students per Exam */}
                      {questionGroups.length > 0 && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <BookOutlined className="text-slate-500" />
                              <span>Phân bổ đề thi & Học sinh được giao</span>
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {questionGroups.length} đề thi
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              Tổng {studentStats.length} học sinh trong đợt giao
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {examStudentAssignments.map((eg: any) => {
                              const attemptedCount = eg.students.filter(
                                (s: any) => s.examStatus !== "not_started"
                              ).length;
                              return (
                                <div
                                  key={eg.examId}
                                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2 hover:border-slate-300 transition-all"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <FileTextOutlined className="text-slate-400 shrink-0 text-xs" />
                                      <span
                                        className="font-bold text-xs text-slate-800 truncate"
                                        title={eg.examTitle}
                                      >
                                        {eg.examTitle}
                                      </span>
                                      {eg.examCode && (
                                        <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded shrink-0">
                                          {eg.examCode}
                                        </span>
                                      )}
                                    </div>
                                    {eg.examType === "exam" ? (
                                      <span className="text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full shrink-0">
                                        Đề kiểm tra
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full shrink-0">
                                        Đề ôn tập
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-slate-500 flex items-center justify-between">
                                    <span>{eg.questions.length} câu hỏi</span>
                                    <span>
                                      Đã tham gia:{" "}
                                      <strong className="text-slate-700">
                                        {attemptedCount}/{eg.students.length}
                                      </strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200/70">
                                    {eg.students.map((st: any) => (
                                      <div
                                        key={st.studentId}
                                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 px-2 py-1 rounded-md text-xs shadow-2xs"
                                      >
                                        <UserOutlined className="text-slate-400 text-[11px]" />
                                        <span className="font-semibold text-slate-700">
                                          {st.fullName}
                                        </span>
                                        {st.examStatus === "finished" && (
                                          <Tag
                                            color="success"
                                            className="border-none rounded-full text-[10px] font-medium m-0 px-1.5"
                                          >
                                            ✓ 100%
                                          </Tag>
                                        )}
                                        {st.examStatus === "submitted" && (
                                          <Tag
                                            color="gold"
                                            className="border-none rounded-full text-[10px] font-medium m-0 px-1.5"
                                          >
                                            {st.bestPercentage != null
                                              ? `${Math.round(st.bestPercentage)}%`
                                              : "Đã nộp"}
                                          </Tag>
                                        )}
                                        {st.examStatus === "in_progress" && (
                                          <Tag
                                            color="warning"
                                            className="border-none rounded-full text-[10px] font-medium m-0 px-1.5"
                                          >
                                            Đang làm
                                          </Tag>
                                        )}
                                        {st.examStatus === "not_started" && (
                                          <Tag
                                            color="default"
                                            className="border-none rounded-full text-[10px] text-slate-400 m-0 px-1.5"
                                          >
                                            Chưa làm
                                          </Tag>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Question Breakdown – Clean, grouped by Exam */}
                      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <span>Thống kê theo câu hỏi</span>
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {totalQuestionCount} câu
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Tỷ lệ câu trả lời đúng của học sinh theo từng đề thi
                            </div>
                          </div>

                          {questionGroups.length > 1 && (
                            <Segmented
                              size="small"
                              value={selectedExamFilter}
                              onChange={(val: any) => setSelectedExamFilter(val)}
                              options={[
                                { label: `Tất cả đề (${questionGroups.length})`, value: "all" },
                                ...questionGroups.map((g, idx) => ({
                                  label: `${g.examTitle} (${g.questions.length})`,
                                  value: g.examId || `exam_${idx}`,
                                })),
                              ]}
                            />
                          )}
                        </div>

                        {filteredQuestionGroups.length > 0 ? (
                          <div className="space-y-5">
                            {filteredQuestionGroups.map((group, gIdx) => (
                              <div
                                key={group.examId || gIdx}
                                className="rounded-xl border border-slate-200/80 overflow-hidden bg-white"
                              >
                                {/* Exam Header Banner */}
                                <div className="bg-slate-50/90 px-3.5 py-2.5 border-b border-slate-200/80 space-y-2">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <FileTextOutlined className="text-slate-400 text-sm" />
                                      <span className="text-xs font-bold text-slate-800">
                                        {group.examTitle}
                                      </span>
                                      {group.examCode && (
                                        <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                          {group.examCode}
                                        </span>
                                      )}
                                      <span className="text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                        {group.questions.length} câu hỏi
                                      </span>
                                      {group.examType === "exam" ? (
                                        <span className="text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
                                          Đề kiểm tra
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                          Đề ôn tập
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Assigned Students for this specific exam */}
                                  {(() => {
                                    const matchEg = examStudentAssignments.find(
                                      (e: any) => e.examId === group.examId
                                    );
                                    const students = matchEg?.students || [];
                                    if (!students.length) return null;
                                    return (
                                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-200/60 text-xs">
                                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mr-1">
                                          <TeamOutlined className="text-slate-400 text-xs" />
                                          Học sinh được giao ({students.length}):
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {students.map((st: any) => (
                                            <span
                                              key={st.studentId}
                                              className="inline-flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md text-xs"
                                            >
                                              <span className="font-semibold text-slate-700">
                                                {st.fullName}
                                              </span>
                                              {st.examStatus === "finished" && (
                                                <Tag
                                                  color="success"
                                                  className="border-none rounded-full text-[10px] font-medium m-0 px-1"
                                                >
                                                  100%
                                                </Tag>
                                              )}
                                              {st.examStatus === "submitted" && (
                                                <Tag
                                                  color="orange"
                                                  className="border-none rounded-full text-[10px] font-medium m-0 px-1"
                                                >
                                                  {st.bestPercentage != null
                                                    ? `${st.bestPercentage}%`
                                                    : "Đã nộp"}
                                                </Tag>
                                              )}
                                              {st.examStatus === "in_progress" && (
                                                <Tag
                                                  color="warning"
                                                  className="border-none rounded-full text-[10px] font-medium m-0 px-1"
                                                >
                                                  Đang làm
                                                </Tag>
                                              )}
                                              {st.examStatus === "not_started" && (
                                                <Tag
                                                  color="default"
                                                  className="border-none rounded-full text-[10px] text-slate-400 m-0 px-1"
                                                >
                                                  Chưa làm
                                                </Tag>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Questions Table */}
                                <Table
                                  size="small"
                                  pagination={false}
                                  rowKey={(r: any) => `${group.examId}_${r.questionId || r.displayIndex}`}
                                  dataSource={group.questions}
                                  className="overflow-hidden"
                                  columns={[
                                    {
                                      title: "STT",
                                      width: 75,
                                      render: (_: any, r: any) => (
                                        <span className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                          Câu {r.displayIndex}
                                        </span>
                                      ),
                                    },
                                    {
                                      title: "Nội dung câu hỏi",
                                      dataIndex: "displayPrompt",
                                      render: (prompt: string, r: any) => {
                                        const rounded = Math.round(r.correctnessRate || 0);
                                        const wrongCount = r.total - r.correct;
                                        const strokeColor =
                                          rounded >= 70 ? "#10b981" : rounded >= 40 ? "#f59e0b" : "#ef4444";
                                        const popoverContent = (
                                          <div className="w-72 space-y-2.5">
                                            <div className="text-xs text-slate-700 font-medium leading-relaxed">
                                              {prompt}
                                            </div>
                                            <div className="border-t border-slate-100 pt-2 space-y-1.5">
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Số học sinh làm</span>
                                                <span className="font-bold text-slate-700">{r.total} học sinh</span>
                                              </div>
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                  <CheckOutlined />
                                                  Trả lời đúng
                                                </span>
                                                <span className="font-bold text-emerald-700">
                                                  {r.correct} ({rounded}%)
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-rose-500">
                                                  <CloseOutlined />
                                                  Trả lời sai
                                                </span>
                                                <span className="font-bold text-rose-600">
                                                  {wrongCount} ({100 - rounded}%)
                                                </span>
                                              </div>
                                              <Progress
                                                percent={rounded}
                                                size="small"
                                                strokeColor={strokeColor}
                                                format={(p) => `${p}%`}
                                              />
                                            </div>
                                          </div>
                                        );
                                        return (
                                          <Popover
                                            content={popoverContent}
                                            title={
                                              <span className="text-xs font-bold text-slate-800">
                                                Câu {r.displayIndex} – Thống kê chi tiết
                                              </span>
                                            }
                                            trigger="hover"
                                            placement="right"
                                          >
                                            <span className="text-slate-700 text-xs font-normal line-clamp-1 cursor-pointer hover:text-indigo-600 transition-colors">
                                              {prompt}
                                            </span>
                                          </Popover>
                                        );
                                      },
                                    },
                                    {
                                      title: "Đúng / Tổng",
                                      width: 100,
                                      align: "center" as const,
                                      render: (_: any, r: any) => (
                                        <span className="font-semibold text-slate-700 text-xs">
                                          {r.correct} / {r.total}
                                        </span>
                                      ),
                                    },
                                    {
                                      title: "Tỷ lệ đúng",
                                      width: 180,
                                      dataIndex: "correctnessRate",
                                      render: (rate: number) => {
                                        const rounded = Math.round(rate || 0);
                                        const strokeColor =
                                          rounded >= 70 ? "#10b981" : rounded >= 40 ? "#f59e0b" : "#ef4444";
                                        return (
                                          <div className="flex items-center gap-2">
                                            <Progress
                                              percent={rounded}
                                              size="small"
                                              strokeColor={strokeColor}
                                              className="m-0 flex-1"
                                            />
                                          </div>
                                        );
                                      },
                                    },
                                  ]}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-slate-400 text-xs">
                            Chưa có câu hỏi nào được ghi nhận làm bài
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },

                // ========== TAB 2: STUDENT BREAKDOWN ==========
                {
                  key: "students",
                  label: (
                    <span className="flex items-center gap-2 px-1 font-semibold">
                      <TeamOutlined />
                      <span>Danh sách học sinh & Kết quả ({studentStats.length})</span>
                    </span>
                  ),
                  children: (
                    <div className="space-y-4 pt-2">
                      {/* Search and Status Filters */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lọc:</span>
                          <Segmented
                            size="small"
                            value={studentStatusFilter}
                            onChange={(val: any) => setStudentStatusFilter(val)}
                            options={[
                              { label: `Tất cả (${studentStats.length})`, value: "all" },
                              { label: `Đã hoàn thành 100% (${totalFinished})`, value: "finished" },
                              { label: `Cần làm lại / Đang làm (${totalInProgress})`, value: "in_progress" },
                              { label: `Chưa làm (${totalNotStarted})`, value: "not_started" },
                            ]}
                          />
                        </div>
                        <Input
                          placeholder="Tìm học sinh theo tên, mã..."
                          prefix={<SearchOutlined className="text-slate-400" />}
                          size="small"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          allowClear
                          className="w-full sm:w-64 rounded-xl"
                        />
                      </div>

                      {/* Student Results Table */}
                      <Table
                        size="small"
                        rowKey="studentId"
                        dataSource={filteredStudents}
                        pagination={{ pageSize: 8, showSizeChanger: false }}
                        className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
                        expandable={{
                          expandRowByClick: false,
                          rowExpandable: (r: any) => (r.allAttempts?.length || r.attemptsCount || 0) > 0,
                          expandedRowRender: (r: any) => {
                            const attempts: any[] = r.submittedAttempts || r.allAttempts || [];
                            const inProgressAtts = (r.allAttempts || []).filter(
                              (a: any) => a.status === "in_progress",
                            );
                            return (
                              <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-3 ml-8 my-2">
                                <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                                  <ClockCircleOutlined className="text-indigo-400" />
                                  Lịch sử làm bài của {r.fullName}
                                  <Tag
                                    color="indigo"
                                    className="ml-1 text-[10px] font-semibold border-none rounded-full"
                                  >
                                    {attempts.length} lượt đã nộp
                                    {inProgressAtts.length > 0 ? ` + ${inProgressAtts.length} đang làm` : ""}
                                  </Tag>
                                </div>
                                <Table
                                  size="small"
                                  pagination={false}
                                  rowKey="id"
                                  dataSource={attempts}
                                  className="rounded-xl overflow-hidden"
                                  columns={[
                                    {
                                      title: "Lượt",
                                      width: 70,
                                      render: (_: any, att: any, i: number) => {
                                        const num = att.attemptNumber ?? i + 1;
                                        const isFirst = num === 1;
                                        return (
                                          <Tag
                                            color={isFirst ? "purple" : "default"}
                                            className="font-bold rounded-full px-2.5 m-0 text-xs border-none"
                                          >
                                            Lượt {num}
                                            {isFirst && <span className="ml-1 text-[9px] opacity-70">(đề thi)</span>}
                                          </Tag>
                                        );
                                      },
                                    },
                                    {
                                      title: "Loại",
                                      width: 110,
                                      render: (_: any, att: any) => {
                                        const phase = att.attemptPhase;
                                        if (phase === "remediation") {
                                          return (
                                            <Tag color="orange" className="text-[10px] border-none rounded-full m-0">
                                              Ôn tập (câu sai)
                                            </Tag>
                                          );
                                        }
                                        return (
                                          <Tag color="blue" className="text-[10px] border-none rounded-full m-0">
                                            Lượt đầu
                                          </Tag>
                                        );
                                      },
                                    },
                                    {
                                      title: "Số câu",
                                      width: 80,
                                      align: "center" as const,
                                      render: (_: any, att: any) => (
                                        <span className="text-xs text-slate-600 font-semibold">
                                          {att.attemptQuestionCount ?? att.totalQuestions ?? "—"}
                                        </span>
                                      ),
                                    },
                                    {
                                      title: "Điểm",
                                      width: 120,
                                      render: (_: any, att: any) => {
                                        const sc = att.score != null ? Number(att.score) : null;
                                        const mx = att.maxScore != null ? Number(att.maxScore) : null;
                                        const pct = att.percentage != null ? parseFloat(att.percentage) : null;
                                        if (sc == null) return <span className="text-slate-400 text-xs">—</span>;
                                        return (
                                          <div>
                                            <div className="font-bold text-slate-800 text-xs">
                                              {sc}
                                              {mx != null ? ` / ${mx}` : ""}
                                            </div>
                                            {pct != null && (
                                              <div
                                                className={`text-[10px] font-semibold ${
                                                  pct >= 100
                                                    ? "text-emerald-600"
                                                    : pct >= 50
                                                    ? "text-amber-600"
                                                    : "text-rose-500"
                                                }`}
                                              >
                                                {pct.toFixed(0)}%
                                              </div>
                                            )}
                                          </div>
                                        );
                                      },
                                    },
                                    {
                                      title: "Kết quả",
                                      width: 140,
                                      render: (_: any, att: any) => {
                                        const pct = att.percentage != null ? parseFloat(att.percentage) : null;
                                        const correct = att.attemptCorrectCount;
                                        const total = att.attemptQuestionCount ?? att.totalQuestions;
                                        return (
                                          <div className="flex items-center gap-1.5">
                                            {correct != null && total != null ? (
                                              <>
                                                <Tag color="green" className="text-[10px] m-0 border-none rounded-full">
                                                  Đúng {correct}
                                                </Tag>
                                                <Tag color="volcano" className="text-[10px] m-0 border-none rounded-full">
                                                  Sai {total - correct}
                                                </Tag>
                                              </>
                                            ) : pct != null ? (
                                              <span
                                                className={`text-xs font-semibold ${
                                                  pct >= 100 ? "text-emerald-600" : "text-rose-500"
                                                }`}
                                              >
                                                {pct.toFixed(0)}%
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 text-xs">—</span>
                                            )}
                                          </div>
                                        );
                                      },
                                    },
                                    {
                                      title: "Nộp lúc",
                                      width: 130,
                                      render: (_: any, att: any) => (
                                        <span className="text-[11px] text-slate-500">
                                          {formatDateTime(att.submittedAt || att.createdAt)}
                                        </span>
                                      ),
                                    },
                                    {
                                      title: "Thời lượng",
                                      width: 90,
                                      render: (_: any, att: any) => (
                                        <span className="text-[11px] text-slate-500">
                                          {formatDuration(att.durationSeconds)}
                                        </span>
                                      ),
                                    },
                                    {
                                      title: "Xem",
                                      width: 70,
                                      align: "right" as const,
                                      render: (_: any, att: any) => (
                                        <Button
                                          type="link"
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={() =>
                                            handleOpenAttemptDetailById(att.id, r.fullName, att)
                                          }
                                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-0"
                                        />
                                      ),
                                    },
                                  ]}
                                />
                              </div>
                            );
                          },
                        }}
                        columns={[
                          {
                            title: "Mã",
                            dataIndex: "code",
                            width: 100,
                            render: (v: string) => (
                              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {v}
                              </span>
                            ),
                          },
                          {
                            title: "Họ và tên",
                            dataIndex: "fullName",
                            render: (v: string, r: any) => (
                              <div>
                                <div className="font-semibold text-slate-800 text-xs">{v}</div>
                                {r.email && r.email !== "—" && (
                                  <div className="text-[11px] text-slate-400">{r.email}</div>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: "Trạng thái",
                            dataIndex: "status",
                            width: 140,
                            render: (st: string) => {
                              if (st === "finished") {
                                return (
                                  <Tag color="success" className="font-semibold rounded-full border-none text-xs">
                                    Đã hoàn thành
                                  </Tag>
                                );
                              }
                              if (st === "in_progress") {
                                return (
                                  <Tag color="warning" className="font-semibold rounded-full border-none text-xs">
                                    Đang làm bài
                                  </Tag>
                                );
                              }
                              if (st === "submitted") {
                                return (
                                  <Tag color="orange" className="font-semibold rounded-full border-none text-xs">
                                    Cần làm lại
                                  </Tag>
                                );
                              }
                              return (
                                <Tag color="default" className="rounded-full border-none text-xs text-slate-400">
                                  Chưa bắt đầu
                                </Tag>
                              );
                            },
                          },
                          {
                            title: "Số lượt nộp",
                            dataIndex: "attemptsCount",
                            width: 95,
                            align: "center" as const,
                            render: (cnt: number, r: any) => (
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-bold text-slate-700 text-xs">{cnt}</span>
                                {r.hasInProgress && (
                                  <Tag color="processing" className="text-[9px] border-none m-0 px-1">
                                    +1 đang làm
                                  </Tag>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: "Điểm thi (Lượt 1)",
                            key: "firstAttemptScore",
                            width: 130,
                            render: (_: any, r: any) => {
                              const att = r.firstAttempt;
                              if (!att) return <span className="text-slate-400 text-xs">—</span>;
                              const sc = att.score != null ? Number(att.score) : null;
                              const mx = att.maxScore != null ? Number(att.maxScore) : null;
                              const pct = att.percentage != null ? parseFloat(att.percentage) : null;
                              if (sc == null) return <span className="text-slate-400 text-xs">—</span>;
                              return (
                                <div>
                                  <span className="font-bold text-slate-800 text-xs">
                                    {formatScore(sc)}
                                    {mx != null ? ` / ${formatScore(mx)}` : ""}
                                  </span>
                                  {pct != null && (
                                    <span
                                      className={`ml-1 text-[11px] font-semibold ${
                                        pct >= 100
                                          ? "text-emerald-600"
                                          : pct >= 50
                                          ? "text-amber-600"
                                          : "text-rose-500"
                                      }`}
                                    >
                                      ({formatPercentage(pct)}%)
                                    </span>
                                  )}
                                </div>
                              );
                            },
                          },
                          {
                            title: "Điểm cao nhất",
                            key: "bestScore",
                            width: 120,
                            render: (_: any, r: any) => {
                              if (r.bestScore == null) return <span className="text-slate-400 text-xs">—</span>;
                              return (
                                <div>
                                  <span className="font-bold text-emerald-700 text-xs">
                                    {formatScore(r.bestScore)}
                                  </span>
                                  {r.bestPercentage != null && (
                                    <span className="ml-1 text-[11px] font-semibold text-emerald-600">
                                      ({formatPercentage(r.bestPercentage)}%)
                                    </span>
                                  )}
                                </div>
                              );
                            },
                          },
                          {
                            title: "Chi tiết",
                            key: "action",
                            width: 80,
                            align: "center" as const,
                            render: (_: any, r: any) => (
                              <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleOpenAttemptDetail(r)}
                                disabled={!r.firstAttemptId && !r.latestAttemptId}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                              >
                                Xem
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Nested Attempt Detail Modal */}
      <TeacherAttemptDetailModal
        assignmentId={assignmentId}
        attemptId={detailAttemptId}
        studentName={detailStudentName}
        attemptSummary={detailAttemptSummary}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailAttemptId(null);
          setDetailStudentName("");
          setDetailAttemptSummary(null);
        }}
      />
    </>
  );
}
