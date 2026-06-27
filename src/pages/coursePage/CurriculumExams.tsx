import { Typography, Row, Col, Spin, Alert, Empty, message, Tag, Button } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  PlayCircle,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { learningCmsService } from "../../services/learningCmsService";
import { studentLearningService } from "../../services/studentLearningService";
import { useAuth } from "../../contexts/AuthContext";
import { Curriculum, Exam } from "../../types/backend";

const { Title, Text } = Typography;

const formatMinutes = (sec: number) => (sec ? `${Math.ceil(sec / 60)} phút` : "Không giới hạn");

type ExamEntry = {
  examId: string;
  orderIndex: number;
  isRequired: boolean;
  availableFrom?: string;
  availableUntil?: string;
  exam?: Exam;
};

type StudentCurriculumRow = {
  id: string;
  assignmentStudentId?: string;
  curriculum?: { id: string };
  assignment?: { curriculum?: { id: string } };
};

export default function CurriculumExams() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  // Map from examId -> question count (loaded separately via exam GET)
  const [examQuestionCounts, setExamQuestionCounts] = useState<Record<string, number>>({});

  // Student assignment ID for this curriculum (needed to start attempt)
  const [studentAssignmentId, setStudentAssignmentId] = useState<string | null>(null);

  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!curriculumId) return;
    let active = true;

    async function load() {
      try {
        setIsLoading(true);

        // Load curriculum detail from CMS
        const cur = await learningCmsService.curriculums.get(curriculumId!);
        if (active) setCurriculum(cur);

        // Load each exam's detail to get the accurate question count.
        // The curriculum GET endpoint does NOT include examQuestions in the nested exam
        // object — only the dedicated exam GET returns the `questions` array.
        const examMappings = cur.exams ?? [];
        if (examMappings.length > 0) {
          const counts: Record<string, number> = {};
          await Promise.all(
            examMappings.map(async (mapping) => {
              const eid = (mapping as any).examId ?? mapping.exam?.id;
              if (!eid) return;
              try {
                const examDetail = await learningCmsService.exams.get(eid);
                // Backend mapExam() returns field named `questions` = examQuestions array
                const qArr =
                  (examDetail as any).questions ??
                  (examDetail as any).examQuestions ??
                  [];
                counts[eid] = Array.isArray(qArr) ? qArr.length : 0;
              } catch {
                counts[eid] = 0;
              }
            }),
          );
          if (active) setExamQuestionCounts(counts);
        }

        // If student, also load their assignment for this curriculum so we can startAttempt
        if (isStudent) {
          try {
            const res = await studentLearningService.curriculums.list({ page: 1, limit: 100 });
            const rows = res.data as StudentCurriculumRow[];
            const matched = rows.find((row) => {
              const cId =
                row.curriculum?.id || row.assignment?.curriculum?.id;
              return cId === curriculumId;
            });
            if (active && matched) {
              setStudentAssignmentId(matched.assignmentStudentId ?? matched.id);
            }
          } catch {
            // silently ignore — student may not be assigned yet
          }
        }

        if (active) setError(null);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Không thể tải giáo trình.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [curriculumId, isStudent]);

  const handleStartExam = async (examId: string) => {
    if (!isStudent) {
      message.info("Chỉ học sinh mới có thể làm bài thi. Bạn đang xem ở chế độ preview.");
      return;
    }
    if (!studentAssignmentId) {
      message.warning(
        "Bạn chưa được giao giáo trình này. Vui lòng liên hệ giáo viên để được phân công.",
      );
      return;
    }
    try {
      setStartingExamId(examId);
      const attempt = await studentLearningService.curriculums.startAttempt(
        studentAssignmentId,
        examId,
      );
      const attemptId = (attempt as any)?.id;
      if (!attemptId) throw new Error("Backend không trả về attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể bắt đầu bài thi.");
    } finally {
      setStartingExamId(null);
    }
  };

  const exams: ExamEntry[] = (curriculum?.exams ?? []).sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  const canDoExam = isStudent && !!studentAssignmentId;

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/courses/published-curriculums")}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại danh sách giáo trình
        </button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={error} />
        ) : !curriculum ? null : (
          <>
            {/* Header */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 mb-10 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600 shrink-0">
                  <BookOpen size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-slate-400">{curriculum.code}</span>
                    <Tag color="green" className="rounded-full px-3">
                      Published
                    </Tag>
                    {curriculum.level && (
                      <Tag color="blue" className="rounded-full px-3">
                        {curriculum.level.name}
                      </Tag>
                    )}
                  </div>
                  <Title level={1} className="!text-3xl !font-bold !text-slate-800 !mb-3 !mt-0">
                    {curriculum.title}
                  </Title>
                  {curriculum.description && (
                    <Text className="text-slate-500 text-base">{curriculum.description}</Text>
                  )}

                  {/* Student assignment status */}
                  {isStudent && (
                    <div
                      className={`mt-4 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl inline-flex w-fit ${
                        canDoExam
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {canDoExam ? (
                        <>
                          <CheckCircle2 size={16} />
                          Bạn đã được giao giáo trình này — sẵn sàng làm bài!
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          Chưa được giao giáo trình — liên hệ giáo viên để được phân công.
                        </>
                      )}
                    </div>
                  )}

                  {!isStudent && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl inline-flex w-fit bg-slate-50 text-slate-500">
                      <Lock size={16} />
                      Bạn đang xem ở chế độ preview — chỉ học sinh mới có thể làm bài thi.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Exam list */}
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                <FileText size={20} />
              </div>
              <Title level={2} className="!text-2xl !font-bold !text-slate-800 !m-0">
                Danh sách bài thi ({exams.length})
              </Title>
            </div>

            {exams.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                <Empty description="Giáo trình này chưa có bài thi nào." />
              </div>
            ) : (
              <Row gutter={[0, 16]}>
                {exams.map((entry, idx) => {
                  const exam = entry.exam;
                  const eid = (entry as any).examId ?? exam?.id ?? "";
                  // Use counts loaded via exam GET (curriculum GET does not include examQuestions)
                  const qCount = examQuestionCounts[eid] ?? exam?.examQuestions?.length ?? exam?.questions?.length ?? 0;
                  const isStarting = startingExamId === (exam?.id ?? entry.examId);

                  return (
                    <Col xs={24} key={entry.examId}>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-indigo-200 transition-colors"
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                      >
                        <div className="flex items-start gap-5">
                          <div className="bg-indigo-50 rounded-xl p-3 text-indigo-600 shrink-0 font-bold text-lg w-12 h-12 flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                              {exam?.title ?? exam?.code ?? `Bài thi ${idx + 1}`}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock size={15} className="text-indigo-400" />
                                <span>{formatMinutes(exam?.timeLimitSeconds ?? 0)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <FileText size={15} className="text-indigo-400" />
                                <span>{qCount} câu hỏi</span>
                              </div>
                              {entry.isRequired && (
                                <Tag color="red" className="rounded-full">
                                  Bắt buộc
                                </Tag>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="primary"
                          size="large"
                          icon={<PlayCircle size={18} />}
                          loading={isStarting}
                          disabled={isStarting || (!canDoExam && isStudent)}
                          className={`w-full md:w-auto h-12 px-8 text-base rounded-xl border-none font-semibold flex items-center gap-2 ${
                            canDoExam || !isStudent
                              ? "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                          onClick={() => handleStartExam(exam?.id ?? entry.examId)}
                        >
                          {isStudent
                            ? canDoExam
                              ? "Làm bài ngay"
                              : "Chưa được giao"
                            : "Xem trước (chỉ HS)"}
                        </Button>
                      </motion.div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </>
        )}
      </div>
    </div>
  );
}
