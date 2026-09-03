import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Result, Spin } from "antd";
import { BugOutlined } from "@ant-design/icons";
import ExamContainer from "./ExamContainer";
import { studentLearningService } from "../../services/studentLearningService";
import { learningCmsService } from "../../services/learningCmsService";
import { resolveMediaUrl } from "../../services/apiClient";
import { ExamData, ExamMedia, ExamOption, ExamQuestion, QuestionType } from "../../types";
import { examDataMap } from "../../data/mockData";

interface ExamPageProps {
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

type AttemptPayload = {
  id: string;
  examId?: string;
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
  answer?: any;
  correctAnswer?: any;
  isCorrect?: boolean;
  feedback?: {
    explanation?: string;
  };
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

function cleanString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function findMockQuestion(prompt: string, type: string) {
  const mockExam = examDataMap["exam_kata_01"];
  if (!mockExam) return null;

  const cleanedPrompt = cleanString(prompt);

  // Try to find by content match
  let found = mockExam.questions.find((q) => {
    const qContent = cleanString(q.questionContent);
    return (
      qContent === cleanedPrompt ||
      qContent.includes(cleanedPrompt) ||
      cleanedPrompt.includes(qContent)
    );
  });

  if (found) return found;

  // Fallback: match by normalized type & prompt prefix
  const normType = (t: string) => t.toLowerCase().replace(/_/g, "-");
  found = mockExam.questions.find((q) => {
    return (
      normType(q.type) === normType(type) &&
      cleanString(q.questionContent).slice(0, 15) === cleanedPrompt.slice(0, 15)
    );
  });

  return found || null;
}

export function parseBackendAnswer(type: string, ansObj: any): any {
  if (!ansObj) return undefined;
  if (typeof ansObj === "string") return ansObj;

  switch (type) {
    case "multiple_choice":
    case "audio_choice":
    case "image_choice":
    case "reading_comprehension":
    case "multiple-choice":
    case "listening":
    case "true-false":
      if (Array.isArray(ansObj)) return ansObj[0];
      return ansObj.selectedOptionIds?.[0] || ansObj.value || ansObj.id || ansObj.text || ansObj;

    case "word_ordering":
    case "word-ordering":
      if (Array.isArray(ansObj)) return ansObj;
      return ansObj.tokens || ansObj.words || [];

    case "sentence_rewrite":
    case "hint_rewrite":
    case "fill-in-the-blank":
      if (Array.isArray(ansObj)) return ansObj[0] || "";
      return ansObj.text || ansObj.acceptedAnswers?.[0] || ansObj.value || "";

    case "error_correction":
      return ansObj.correctedSentence || ansObj.text || ansObj;

    case "matching": {
      const pairsObj: Record<string, string> = {};
      const pairs = Array.isArray(ansObj.pairs) ? ansObj.pairs : (Array.isArray(ansObj) ? ansObj : []);
      pairs.forEach((p: any) => {
        if (p.leftItemId) {
          pairsObj[p.leftItemId] = p.rightItemId;
        }
      });
      return Object.keys(pairsObj).length > 0 ? pairsObj : ansObj;
    }
  }
  return ansObj;
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

      const attemptContent = [snapshot.instruction, snapshot.prompt].filter(Boolean).join("\n\n");
      const mockQuestion = findMockQuestion(attemptContent, answer.questionType);

      const snapshotCorrectOpt = snapshot.options?.find(
        (o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true")
      );
      const snapshotCorrectId = snapshotCorrectOpt ? (snapshotCorrectOpt.id || snapshotCorrectOpt.label || snapshotCorrectOpt.content) : undefined;

      const rawDetailCorrect = (detail as any).correctOptionId ||
        (Array.isArray((detail as any).correctOptionIds) ? (detail as any).correctOptionIds[0] : undefined) ||
        (detail as any).correctAnswer ||
        (detail as any).correctTokens ||
        (detail as any).acceptedAnswers?.[0];

      const backendCorrectAnswer =
        parseBackendAnswer(answer.questionType, answer.correctAnswer) ??
        parseBackendAnswer(answer.questionType, (snapshot as any).correctAnswer) ??
        parseBackendAnswer(answer.questionType, rawDetailCorrect) ??
        snapshotCorrectId ??
        mockQuestion?.correctAnswer;

      let options =
        answer.questionType === "word_ordering"
          ? ((detail.correctTokens as string[] | undefined) || (detail.tokens as string[] | undefined) || [])
          : snapshot.options?.map((option) => {
              const optionId = option.id || option.content;
              const isOptCorrect =
                (option as any).isCorrect === true ||
                String((option as any).isCorrect) === "true" ||
                (detail as any).correctOptionId === optionId ||
                (Array.isArray((detail as any).correctOptionIds) && (detail as any).correctOptionIds.includes(optionId)) ||
                (backendCorrectAnswer !== undefined && (String(backendCorrectAnswer) === String(optionId) || String(backendCorrectAnswer) === String(option.label)));
              return {
                id: option.id,
                label: option.label,
                content: option.content,
                orderIndex: option.orderIndex,
                isCorrect: isOptCorrect,
              };
            });

      if ((!options || options.length === 0) && mockQuestion?.options) {
        options = mockQuestion.options;
      }

      let leftItems: any = Array.isArray(detail.leftItems)
        ? (detail.leftItems as Array<{ id?: string; text?: string }>).map((item) => ({
            id: item.id || item.text || "",
            text: item.text || item.id || "",
          }))
        : undefined;

      let rightItems: any = Array.isArray(detail.rightItems)
        ? (detail.rightItems as Array<{ id?: string; text?: string }>).map((item) => ({
            id: item.id || item.text || "",
            text: item.text || item.id || "",
          }))
        : undefined;

      if ((!leftItems || leftItems.length === 0) && mockQuestion?.leftItems) {
        leftItems = mockQuestion.leftItems.map((item: string) => ({ id: item, text: item }));
      }
      if ((!rightItems || rightItems.length === 0) && mockQuestion?.rightItems) {
        rightItems = mockQuestion.rightItems.map((item: string) => ({ id: item, text: item }));
      }

      const backendExplanation = answer.feedback?.explanation || answer.question?.feedback?.explanation || answer.question?.explanation;

      return {
        id: answer.questionId,
        type: answer.questionType,
        questionVersionId: answer.questionVersionId,
        questionContent: attemptContent,
        passage: mockQuestion?.passage || detail.passage?.content || (typeof detail.passageContent === "string" ? detail.passageContent : undefined),
        media,
        options,
        leftItems,
        rightItems,
        correctAnswer: backendCorrectAnswer,
        explanation: backendExplanation || mockQuestion?.explanation || "",
        userAnswer: parseBackendAnswer(answer.questionType, answer.answer),
        isCorrect: answer.isCorrect,
        answeredAt: (answer as any).answeredAt,
        sourceSentence: detail.sourceSentence || mockQuestion?.sourceSentence,
        incorrectSentence: detail.incorrectSentence || mockQuestion?.incorrectSentence,
        hintWord: detail.hintWord || mockQuestion?.hintWord,
      } as any;
    });

  return {
    id: attempt.id,
    title: attempt.exam?.title || "Bai thi",
    timeLimit: attempt.timeLimitSecondsSnapshot || attempt.exam?.timeLimitSeconds || 0,
    examType: (attempt as any).examType || (attempt as any).examTypeSnapshot || attempt.exam?.examType || "practice",
    status: attempt.status,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    questions,
    examId: attempt.examId,
    assignmentStudentId: attempt.assignmentStudentId,
    curriculumAssignmentStudentId: attempt.curriculumAssignmentStudentId,
    source: attempt.source,
    curriculumId: (attempt as any).curriculumId,
    expiresAt: attempt.expiresAt,
    attemptPhase: attempt.attemptPhase,
    taskStatus: attempt.taskStatus,
    mastered: attempt.mastered,
    requiresRemediation: attempt.requiresRemediation,
    remainingQuestionCount: attempt.remainingQuestionCount,
    firstAttemptResult: attempt.firstAttemptResult,
  } as any;
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

        // Fetch exam detail to retrieve its actual title
        if (attempt && attempt.examId) {
          try {
            const examDetail = await learningCmsService.exams.get(attempt.examId);
            if (examDetail) {
              attempt.exam = examDetail as any;
            }
          } catch (eErr) {
            console.error("Failed to fetch exam detail:", eErr);
          }
        }

        // If it's a curriculum exam (self_study), resolve curriculumId from the student's curriculum list
        if (attempt && (attempt as any).source === "self_study" && (attempt as any).curriculumAssignmentStudentId) {
          try {
            const currList = await studentLearningService.curriculums.list({ limit: 100 });
            const matched = currList.data?.find((c: any) => c.enrollmentId === (attempt as any).curriculumAssignmentStudentId);
            if (matched) {
              (attempt as any).curriculumId = matched.curriculumId;
            }
          } catch (cErr) {
            console.error("Failed to load curriculums to resolve curriculumId:", cErr);
          }
        }

        // Fetch detailed question content for all questions to retrieve correct options, passages & explanations
        if (attempt?.answers) {
          await Promise.allSettled(
            attempt.answers.map(async (answer) => {
              if (answer.questionId) {
                try {
                  const fullQuestion = await learningCmsService.questions.get(answer.questionId);
                  if (fullQuestion) {
                    if (!answer.question) {
                      answer.question = {} as any;
                    }
                    if (fullQuestion.options && fullQuestion.options.length > 0) {
                      answer.question.options = fullQuestion.options as any;
                    }
                    if (fullQuestion.explanation) {
                      answer.question.explanation = fullQuestion.explanation;
                    }
                    if (fullQuestion.detail) {
                      answer.question.detail = {
                        ...answer.question.detail,
                        ...fullQuestion.detail,
                      };
                    }
                  }
                } catch (qErr) {
                  console.error("Failed to fetch detailed question:", qErr);
                }
              }
            })
          );
        }

        if (active) {
          setExamData(mapAttemptToExamData(attempt));
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Không thể tải dữ liệu bài thi.";
          setError(
            msg.includes("trùng") || msg.includes("ràng buộc") || msg.includes("Conflict")
              ? "Lượt làm bài này đã được nộp hoặc xảy ra xung đột dữ liệu. Vui lòng quay lại danh sách đề thi để bắt đầu lượt mới."
              : msg
          );
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
        <Result
          status="warning"
          title="Không thể tải bài thi"
          subTitle={error || "Lượt làm bài này đã hoàn thành hoặc không còn tồn tại."}
          extra={[
            <Button
              key="back"
              type="primary"
              onClick={() => window.history.back()}
              className="rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700"
            >
              Quay lại danh sách bài thi
            </Button>,
          ]}
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
