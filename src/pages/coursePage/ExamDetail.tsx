import { ContentSkeleton } from "../../components/LoadingRegion";
import { useAuth } from "../../contexts/AuthContext";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Result, Spin } from "antd";
import { BugOutlined } from "@ant-design/icons";
import ExamContainer from "./ExamContainer";
import { studentLearningService } from "../../services/studentLearningService";
import { learningCmsService } from "../../services/learningCmsService";
import { resolveMediaUrl } from "../../services/apiClient";
import { normalizeLineBreaks } from "../../utils/textFormatters";
import { shuffleTokensWithSeed } from "../../utils/shuffleTokens";
import { ExamData, ExamMedia, ExamOption, ExamQuestion, QuestionType } from "../../types";



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
    examType?: "practice" | "exam";
  };
  answers?: AttemptAnswer[];
  assignmentStudentId?: string;
  curriculumAssignmentStudentId?: string;
  source?: string;
  curriculumId?: string;
  expiresAt?: string | null;
  attemptPhase?: "initial" | "remediation";
  taskStatus?: "in_progress" | "finished" | "mastered" | "remediation_required";
  mastered?: boolean;
  requiresRemediation?: boolean;
  remainingQuestionCount?: number;
  firstAttemptResult?: { score?: string; percentage?: string; displayResult?: string; submittedAt?: string } | null;
  [key: string]: any;
};

type AttemptAnswer = {
  questionId: string;
  questionVersionId?: string;
  questionType: QuestionType;
  orderIndex?: number;
  maxScore?: string;
  answer?: any;
  correctAnswer?: any;
  isCorrect?: boolean;
  answeredAt?: string | null;
  feedback?: {
    explanation?: string;
    [key: string]: any;
  };
  question?: {
    prompt?: string;
    instruction?: string;
    explanation?: string;
    feedback?: {
      explanation?: string;
      [key: string]: any;
    };
    options?: Array<ExamOption & { isCorrect?: boolean }>;
    media?: Array<{
      url?: string;
      type?: string;
      media?: { url?: string; type?: string };
    }>;
    detail?: Record<string, any>;
  };
};

function getMediaType(type?: string): ExamMedia["type"] {
  if (type === "video") return "video";
  if (type === "audio") return "audio";
  return "image";
}

export function parseBackendAnswer(type: string, ansObj: any): any {
  if (!ansObj) return undefined;
  if (typeof ansObj === "string") return ansObj;

  switch (type) {
    case "multiple_choice":
    case "audio_choice":
    case "image_choice":
    case "audio_image_choice":
    case "true_false":
    case "reading_comprehension":
    case "multiple-choice":
    case "listening":
    case "true-false":
      if (Array.isArray(ansObj)) {
        return ansObj.length > 1 ? ansObj : (ansObj[0] || "");
      }
      if (ansObj.selectedOptionIds && Array.isArray(ansObj.selectedOptionIds)) {
        return ansObj.selectedOptionIds.length > 1
          ? ansObj.selectedOptionIds
          : (ansObj.selectedOptionIds[0] || "");
      }
      if (ansObj.correctOptionIds && Array.isArray(ansObj.correctOptionIds)) {
        return ansObj.correctOptionIds.length > 1
          ? ansObj.correctOptionIds
          : (ansObj.correctOptionIds[0] || "");
      }
      return ansObj.selectedOptionId || ansObj.value || ansObj.id || ansObj.text || ansObj;

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

    case "audio_fill_blanks":
    case "audio-fill-blanks": {
      if (ansObj && typeof ansObj === "object") {
        if (Array.isArray(ansObj.blanks)) {
          const dict: Record<string, string> = {};
          ansObj.blanks.forEach((b: any, idx: number) => {
            const id = b?.id || `blank${idx + 1}`;
            const val = b?.value ?? (Array.isArray(b?.acceptedAnswers) ? b.acceptedAnswers.join(" / ") : b?.acceptedAnswers);
            dict[id] = val || "";
          });
          return dict;
        }
        if (Array.isArray(ansObj)) {
          const dict: Record<string, string> = {};
          ansObj.forEach((b: any, idx: number) => {
            const id = b?.id || `blank${idx + 1}`;
            const val = b?.value ?? (Array.isArray(b?.acceptedAnswers) ? b.acceptedAnswers.join(" / ") : b?.acceptedAnswers);
            dict[id] = val || (typeof b === "string" ? b : "");
          });
          return dict;
        }
        const dict: Record<string, string> = {};
        Object.entries(ansObj).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            dict[k] = v.join(" / ");
          } else if (typeof v === "object" && v !== null) {
            dict[k] = (v as any).value || ((v as any).acceptedAnswers ? ((v as any).acceptedAnswers.join ? (v as any).acceptedAnswers.join(" / ") : String((v as any).acceptedAnswers)) : "");
          } else {
            dict[k] = String(v ?? "");
          }
        });
        return dict;
      }
      return ansObj;
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

      const attemptContent = normalizeLineBreaks([snapshot.instruction, snapshot.prompt].filter(Boolean).join("\n\n"));

      const snapshotCorrectOpts = snapshot.options?.filter(
        (o: any) => o && (o.isCorrect === true || String(o.isCorrect) === "true")
      ) || [];
      const snapshotCorrectIds = snapshotCorrectOpts.map((o: any) => o.id || o.label || o.content);
      const snapshotCorrectVal = snapshotCorrectIds.length > 1
        ? snapshotCorrectIds
        : (snapshotCorrectIds[0] ?? undefined);

      const rawDetailCorrect = (detail as any).correctOptionId ||
        (detail as any).correctOptionIds ||
        (detail as any).correctAnswer ||
        (detail as any).correctTokens ||
        (detail as any).acceptedAnswers ||
        (detail as any).blanks;

      const backendCorrectAnswer =
        parseBackendAnswer(answer.questionType, answer.correctAnswer) ??
        parseBackendAnswer(answer.questionType, (snapshot as any).correctAnswer) ??
        parseBackendAnswer(answer.questionType, rawDetailCorrect) ??
        snapshotCorrectVal;

      const isUuidOrId = (val?: string, id?: string) => {
        if (!val) return true;
        const trimmed = String(val).trim();
        if (id && (trimmed === id || trimmed === String(id).trim())) return true;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) || /^[0-9a-f]{24}$/i.test(trimmed);
      };

      let options =
        answer.questionType === "word_ordering" || answer.questionType === "word-ordering"
          ? shuffleTokensWithSeed(
              ((detail.tokens as string[] | undefined) || (detail.correctTokens as string[] | undefined) || []),
              String((answer as any).id || answer.questionId || "word_ord")
            )
          : snapshot.options?.map((option) => {
              const optionId = option.id || option.content;
              const backendCorrArr = Array.isArray(backendCorrectAnswer)
                ? backendCorrectAnswer.map(String)
                : backendCorrectAnswer !== undefined
                ? [String(backendCorrectAnswer)]
                : [];

              const isOptCorrect =
                (option as any).isCorrect === true ||
                String((option as any).isCorrect) === "true" ||
                (detail as any).correctOptionId === optionId ||
                (Array.isArray((detail as any).correctOptionIds) && (detail as any).correctOptionIds.includes(optionId)) ||
                backendCorrArr.includes(String(optionId)) ||
                (option.label && backendCorrArr.includes(String(option.label)));
              const hasMedia = !!(option as any).media;
              const rawContent = option.content ?? "";
              const content = hasMedia && isUuidOrId(rawContent, option.id) ? "" : normalizeLineBreaks(rawContent);
              return {
                id: option.id,
                label: option.label,
                content,
                orderIndex: option.orderIndex,
                isCorrect: isOptCorrect,
                mediaId: (option as any).mediaId,
                media: (option as any).media
                  ? {
                      type: getMediaType((option as any).media.type),
                      url: resolveMediaUrl((option as any).media.url),
                    }
                  : undefined,
              };
            });


      let leftItems: any = Array.isArray(detail.leftItems)
        ? (detail.leftItems as Array<{ id?: string; text?: string; media?: any }>).map((item) => {
            const hasMedia = !!item.media;
            const rawText = item.text ?? "";
            const text = hasMedia && isUuidOrId(rawText, item.id) ? "" : (rawText || (hasMedia ? "" : item.id) || "");
            return {
              id: item.id || item.text || "",
              text: normalizeLineBreaks(text),
              media: item.media
                ? {
                    type: getMediaType(item.media.type),
                    url: resolveMediaUrl(item.media.url),
                  }
                : undefined,
            };
          })
        : undefined;

      let rightItems: any = Array.isArray(detail.rightItems)
        ? (detail.rightItems as Array<{ id?: string; text?: string; media?: any }>).map((item) => {
            const hasMedia = !!item.media;
            const rawText = item.text ?? "";
            const text = hasMedia && isUuidOrId(rawText, item.id) ? "" : (rawText || (hasMedia ? "" : item.id) || "");
            return {
              id: item.id || item.text || "",
              text: normalizeLineBreaks(text),
              media: item.media
                ? {
                    type: getMediaType(item.media.type),
                    url: resolveMediaUrl(item.media.url),
                  }
                : undefined,
            };
          })
        : undefined;

      if (!leftItems && Array.isArray((detail as any).pairs)) {
        leftItems = (detail as any).pairs.map((p: any, idx: number) => {
          const hasMedia = !!p.leftMedia;
          const rawText = p.leftText ?? "";
          const text = hasMedia && isUuidOrId(rawText, p.leftItemId || p.id) ? "" : rawText;
          return {
            id: p.leftItemId || p.id || `left_${idx}`,
            text: normalizeLineBreaks(text),
            media: p.leftMedia
              ? {
                  type: getMediaType(p.leftMedia.type),
                  url: resolveMediaUrl(p.leftMedia.url),
                }
              : undefined,
          };
        });
        rightItems = (detail as any).pairs.map((p: any, idx: number) => {
          const hasMedia = !!p.rightMedia;
          const rawText = p.rightText ?? "";
          const text = hasMedia && isUuidOrId(rawText, p.rightItemId || p.id) ? "" : rawText;
          return {
            id: p.rightItemId || p.rightText || `right_${idx}`,
            text: normalizeLineBreaks(text),
            media: p.rightMedia
              ? {
                  type: getMediaType(p.rightMedia.type),
                  url: resolveMediaUrl(p.rightMedia.url),
                }
              : undefined,
          };
        });
      }


      const backendExplanation = answer.feedback?.explanation || answer.question?.feedback?.explanation || answer.question?.explanation;

      return {
        id: answer.questionId,
        type: answer.questionType,
        questionVersionId: answer.questionVersionId,
        questionContent: attemptContent,
        passage: detail.passage?.content || (typeof detail.passageContent === "string" ? detail.passageContent : undefined),
        passageText: detail.passageText || (snapshot as any).passageText,
        blanks: detail.blanks || (snapshot as any).blanks,
        detail,
        media,
        options,
        leftItems,
        rightItems,
        correctAnswer: backendCorrectAnswer,
        explanation: normalizeLineBreaks(backendExplanation || ""),
        userAnswer: parseBackendAnswer(answer.questionType, answer.answer),
        isCorrect: answer.isCorrect,
        answeredAt: (answer as any).answeredAt,
        sourceSentence: detail.sourceSentence,
        incorrectSentence: detail.incorrectSentence,
        hintWord: detail.hintWord,
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
    assignmentStudentId:
      attempt.assignmentStudentId ||
      (attempt as any).assignmentId ||
      (attempt as any).examAssignmentStudentId,
    curriculumAssignmentStudentId: attempt.curriculumAssignmentStudentId,
    source:
      (attempt as any).source ||
      (attempt.curriculumAssignmentStudentId ? "self_study" : "teacher_assigned"),
    curriculumId: (attempt as any).curriculumId,
    expiresAt: attempt.expiresAt,
    attemptNumber: attempt.attemptNumber ?? (attempt.attemptPhase === "initial" ? 1 : 2),
    attemptPhase: attempt.attemptPhase,
    taskStatus: attempt.taskStatus,
    mastered: attempt.mastered,
    isRedo: (attempt as any).isRedo || (attempt as any).is_redo || false,
    requiresRemediation: attempt.requiresRemediation,
    remainingQuestionCount: attempt.remainingQuestionCount,
    firstAttemptResult: attempt.firstAttemptResult,
  } as any;
}

const ExamPage: React.FC = () => {
  const { hasPermission } = useAuth();
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
        if (attempt && attempt.examId && hasPermission("learning.read")) {
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
        const isCurriculum =
          (attempt as any).source === "self_study" ||
          !!(attempt as any).curriculumAssignmentStudentId;
        if (attempt && isCurriculum && !(attempt as any).curriculumId) {
          try {
            const currList = await studentLearningService.curriculums.list({ page: 1, limit: 1, enrollmentId: (attempt as any).curriculumAssignmentStudentId });
            const list = Array.isArray(currList) ? currList : (currList as any)?.data ?? [];
            const matched = list.find((c: any) =>
              c.enrollmentId === (attempt as any).curriculumAssignmentStudentId ||
              (c as any).id === (attempt as any).curriculumAssignmentStudentId ||
              c.curriculumId === (attempt as any).curriculumAssignmentStudentId
            );
            if (matched) {
              (attempt as any).curriculumId = matched.curriculumId || (matched as any).id;
            }
          } catch (cErr) {
            console.error("Failed to load curriculums to resolve curriculumId:", cErr);
          }
        }

        // Attempt snapshots control content and when answers are revealed.

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
    return <ContentSkeleton variant="detail" />;
  }

  if (error || !examData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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
    />
  );
};

export default ExamPage;
