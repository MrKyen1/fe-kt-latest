import { Typography, Row, Col, Button, Empty, Spin, Alert, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import ExamCard from "./ExamCard";
import { studentLearningService } from "../../services/studentLearningService";

const { Title, Text } = Typography;

type ExamAssignmentRow = {
  id: string;
  assignmentId?: string;
  assignment?: {
    id: string;
    title?: string;
    instructions?: string;
    exam?: AssignmentExam;
  };
  exam?: AssignmentExam;
  summary?: {
    attemptsCount?: number;
  };
};

type CurriculumRow = {
  id: string;
  assignmentStudentId?: string;
  assignment?: {
    id: string;
    title?: string;
    curriculum?: {
      id: string;
      title?: string;
      exams?: Array<{ exam?: AssignmentExam; examId?: string; id?: string }>;
    };
  };
  curriculum?: {
    id: string;
    title?: string;
    exams?: Array<{ exam?: AssignmentExam; examId?: string; id?: string }>;
  };
};

type AssignmentExam = {
  id: string;
  title?: string;
  code?: string;
  timeLimitSeconds?: number;
  questions?: unknown[];
  examQuestions?: unknown[];
};

type ExamListItem = {
  id: string;
  title: string;
  timeLimit: number;
  totalQuestions: number;
  start: () => Promise<unknown>;
};

function getExam(row: ExamAssignmentRow): AssignmentExam | undefined {
  return row.exam || row.assignment?.exam;
}

function getQuestionCount(exam?: AssignmentExam) {
  return exam?.questions?.length ?? exam?.examQuestions?.length ?? 0;
}

function getExamTimeLimit(exam?: AssignmentExam) {
  return exam?.timeLimitSeconds ?? 0;
}

function getAttemptId(attempt: unknown) {
  if (attempt && typeof attempt === "object" && "id" in attempt) {
    return String((attempt as { id: string }).id);
  }
  return "";
}

export default function ExamList() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ExamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const isCurriculum = courseId === "curriculums";
  const title = isCurriculum ? "Lo trinh hoc tap" : "Bai thi duoc giao";

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setIsLoading(true);
        if (isCurriculum) {
          const response = await studentLearningService.curriculums.list({ page: 1, limit: 100 });
          const mapped = (response.data as CurriculumRow[]).flatMap((row) => {
            const curriculum = row.curriculum || row.assignment?.curriculum;
            const assignmentStudentId = row.assignmentStudentId || row.id;
            const exams = curriculum?.exams || [];

            return exams
              .map((mapping) => mapping.exam || ({ id: mapping.examId || mapping.id } as AssignmentExam))
              .filter((exam): exam is AssignmentExam => Boolean(exam?.id))
              .map((exam) => ({
                id: `${assignmentStudentId}:${exam.id}`,
                title: exam.title || exam.code || "Bai thi trong lo trinh",
                timeLimit: getExamTimeLimit(exam),
                totalQuestions: getQuestionCount(exam),
                start: () => studentLearningService.curriculums.startAttempt(assignmentStudentId, exam.id),
              }));
          });
          if (active) setItems(mapped);
        } else {
          const response = await studentLearningService.examAssignments.list({ page: 1, limit: 100 });
          const mapped = (response.data as ExamAssignmentRow[]).map((row) => {
            const exam = getExam(row);
            const assignmentId = row.assignmentId || row.assignment?.id || row.id;
            return {
              id: assignmentId,
              title: row.assignment?.title || exam?.title || exam?.code || "Bai thi duoc giao",
              timeLimit: getExamTimeLimit(exam),
              totalQuestions: getQuestionCount(exam),
              start: () => studentLearningService.examAssignments.startAttempt(assignmentId),
            };
          });
          if (active) setItems(mapped);
        }
        if (active) setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Khong the tai danh sach bai thi.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isCurriculum]);

  const handleStart = async (item: ExamListItem) => {
    try {
      setStartingId(item.id);
      const attempt = await item.start();
      const attemptId = getAttemptId(attempt);
      if (!attemptId) throw new Error("Backend khong tra attemptId.");
      navigate(`/exam/${attemptId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Khong the bat dau bai thi.");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="w-full bg-slate-50 py-16 px-6 md:px-16 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Button
          type="text"
          icon={<ArrowLeft size={20} />}
          className="mb-8 text-slate-500 hover:text-blue-600 flex items-center font-medium"
          onClick={() => navigate("/courses")}
        >
          Quay lai khu vuc hoc tap
        </Button>

        <div className="mb-12">
          <Title level={1} className="text-4xl font-bold text-slate-800 mb-4">
            {title}
          </Title>
          <div className="w-24 h-1 bg-blue-600 rounded-full mb-6" />
          <Text className="text-lg text-slate-600">
            Danh sach nay duoc lay tu backend theo tai khoan dang dang nhap.
          </Text>
        </div>

        {error && <Alert type="error" showIcon className="mb-8" message={error} />}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
            <Empty description="Chua co bai thi nao duoc giao." />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {items.map((exam, idx) => (
              <Col xs={24} key={exam.id}>
                <ExamCard
                  exam={exam}
                  totalQuestions={exam.totalQuestions}
                  index={idx}
                  onStart={() => handleStart(exam)}
                  loading={startingId === exam.id}
                />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
