import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Result, Spin } from "antd";
import { BugOutlined } from "@ant-design/icons";
import ExamContainer from "./ExamContainer";
import { studentLearningService } from "../../services/studentLearningService";
import { resolveMediaUrl } from "../../services/apiClient";
import { ExamData, ExamMedia, ExamOption, ExamQuestion, QuestionType } from "../../types";

interface ExamPageProps {
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

type AttemptPayload = {
  id: string;
  status?: "in_progress" | "submitted";
  score?: string;
  maxScore?: string;
  percentage?: string;
  timeLimitSecondsSnapshot?: number | null;
  exam?: {
    title?: string;
    timeLimitSeconds?: number;
  };
  answers?: AttemptAnswer[];
};

type AttemptAnswer = {
  questionId: string;
  questionType: QuestionType;
  orderIndex?: number;
  maxScore?: string;
  question?: {
    prompt?: string;
    instruction?: string;
    options?: Array<ExamOption & { isCorrect?: boolean }>;
    media?: Array<{
      url?: string;
      type?: string;
      media?: { url?: string; type?: string };
    }>;
    detail?: Record<string, unknown>;
  };
};

function getMediaType(type?: string): ExamMedia["type"] {
  if (type === "video") return "video";
  if (type === "audio") return "audio";
  return "image";
}

function mapAttemptToExamData(attempt: AttemptPayload): ExamData {
  const questions = [...(attempt.answers || [])]
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map<ExamQuestion>((answer) => {
      const snapshot = answer.question || {};
      const detail = snapshot.detail || {};
      const media = (snapshot.media || [])
        .map((item) => {
          const url = item.url || item.media?.url;
          if (!url) return null;
          return {
            type: getMediaType(item.type || item.media?.type),
            url: resolveMediaUrl(url),
          };
        })
        .filter(Boolean) as ExamMedia[];

      const options =
        answer.questionType === "word_ordering"
          ? ((detail.correctTokens as string[] | undefined) || [])
          : snapshot.options?.map((option) => ({
              id: option.id,
              label: option.label,
              content: option.content,
              orderIndex: option.orderIndex,
            }));

      return {
        id: answer.questionId,
        type: answer.questionType,
        questionContent: [snapshot.instruction, snapshot.prompt].filter(Boolean).join("\n\n"),
        passage: typeof detail.passageContent === "string" ? detail.passageContent : undefined,
        media,
        options,
        leftItems: Array.isArray(detail.leftItems)
          ? (detail.leftItems as Array<{ id?: string; text?: string }>).map((item) => item.id || item.text || "")
          : undefined,
        rightItems: Array.isArray(detail.rightItems)
          ? (detail.rightItems as Array<{ id?: string; text?: string }>).map((item) => item.id || item.text || "")
          : undefined,
        explanation: "",
      };
    });

  return {
    id: attempt.id,
    title: attempt.exam?.title || "Bai thi",
    timeLimit: attempt.timeLimitSecondsSnapshot || attempt.exam?.timeLimitSeconds || 0,
    status: attempt.status,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    questions,
  };
}

const ExamPage: React.FC<ExamPageProps> = ({ isDarkMode, toggleDarkMode }) => {
  const { examId: attemptId } = useParams<{ examId: string }>();
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAttempt() {
      if (!attemptId) {
        setError("Khong tim thay attemptId.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const attempt = (await studentLearningService.attempts.get(attemptId)) as AttemptPayload;
        if (active) {
          setExamData(mapAttemptToExamData(attempt));
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Khong the tai du lieu bai thi.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAttempt();
    return () => {
      active = false;
    };
  }, [attemptId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          <BugOutlined className="text-4xl mb-4" />
          <p>{error || "Loi tai bai thi"}</p>
        </div>
      </div>
    );
  }

  if (examData.status === "submitted") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Result
          status="success"
          title="Bai thi da nop"
          subTitle={`Diem: ${examData.score ?? "-"} / ${examData.maxScore ?? "-"} (${examData.percentage ?? "-"}%)`}
          extra={
            <Button type="primary" onClick={() => history.back()}>
              Quay lai
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <ExamContainer
      examData={examData}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
    />
  );
};

export default ExamPage;
