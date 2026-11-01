import React, { useState, useEffect, useMemo } from "react";
import Table from "../../../../../components/Table";
import { ColumnCards } from "../../../../../components/ColumnCards";
import { useResponsive } from "../../../../../hooks/useResponsive";
import {
  Card,
  Button,
  Tag,
  Space,
  Drawer,
  Tabs,
  Typography,
  Spin,
  Empty,
  Badge,
  Tooltip,
  message,
  Popconfirm,
  Modal,
  Form,
  Input,
  Switch,
  Alert,
} from "antd";
import {
  BookOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  SendOutlined,
  FileTextOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Curriculum, Exam, ExamVersionQuestionDetail } from "../../../../../types/backend";
import { learningCmsService } from "../../../../../services/learningCmsService";
import { getErrorMessage } from "../../../../../services/apiClient";
import { ExamVersionQuestionCard } from "./modals/ExamVersionQuestionCard";

const { Title, Text, Paragraph } = Typography;

interface Props {
  curriculums: Curriculum[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  specializationId?: string;
  onRefreshParent?: () => void;
  onOpenQuestionFullEdit?: (question: any) => void;
  lastSavedQuestion?: { id: string; timestamp: number } | null;
}

export const CurriculumOverviewTab: React.FC<Props> = ({
  curriculums,
  loading,
  pagination,
  specializationId,
  onRefreshParent,
  onOpenQuestionFullEdit,
  lastSavedQuestion,
}) => {
  const { isMobile } = useResponsive();
  // Selected Curriculum state
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | null>(null);
  const [curriculumDetail, setCurriculumDetail] = useState<Curriculum | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Exam Preview Drawer state
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"draft" | "published">("draft");

  // Published version questions state
  const [publishedQuestions, setPublishedQuestions] = useState<ExamVersionQuestionDetail[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(false);

  // Question Quick Edit Modal state
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [quickEditModalOpen, setQuickEditModalOpen] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionForm] = Form.useForm();

  // Question metadata map (examId -> { publishedCount, draftCount, hasPublished, loading })
  interface ExamQuestionMeta {
    publishedCount: number;
    draftCount: number;
    hasPublished: boolean;
    loading?: boolean;
  }
  const [examMetaMap, setExamMetaMap] = useState<Record<string, ExamQuestionMeta>>({});

  // Full question details cache for exam preview (questionId -> Question with options, media, level)
  const [fullQuestionsMap, setFullQuestionsMap] = useState<Record<string, any>>({});

  // Load curriculum detail when selected
  const loadCurriculumDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const res = await learningCmsService.curriculums.get(id);
      setCurriculumDetail(res);

      // Asynchronously fetch question count metadata for all exams in curriculum
      const examEntries = res.exams || [];
      if (examEntries.length > 0) {
        setExamMetaMap((prev) => {
          const next = { ...prev };
          examEntries.forEach((item) => {
            const eId = item.examId || item.exam?.id;
            if (eId && !next[eId]) {
              next[eId] = { publishedCount: 0, draftCount: 0, hasPublished: false, loading: true };
            }
          });
          return next;
        });

        Promise.all(
          examEntries.map(async (item) => {
            const eId = item.examId || item.exam?.id;
            if (!eId) return null;
            try {
              const examDetail = await learningCmsService.exams.get(eId);
              const draftCount = examDetail.questions?.length ?? 0;
              let publishedCount = 0;
              let hasPublished = false;

              if (examDetail.currentVersionId) {
                hasPublished = true;
                try {
                  const versions = await learningCmsService.exams.listVersions(eId);
                  const currentVer = versions.find(
                    (v) => v.id === examDetail.currentVersionId || v.isCurrent,
                  );
                  if (currentVer && typeof currentVer.questionCount === "number") {
                    publishedCount = currentVer.questionCount;
                  } else {
                    const verDetail = await learningCmsService.exams.getVersion(
                      eId,
                      examDetail.currentVersionId,
                    );
                    publishedCount = verDetail.questions?.length ?? 0;
                  }
                } catch {
                  try {
                    const verDetail = await learningCmsService.exams.getVersion(
                      eId,
                      examDetail.currentVersionId,
                    );
                    publishedCount = verDetail.questions?.length ?? 0;
                  } catch {
                    publishedCount = 0;
                  }
                }
              }

              return {
                examId: eId,
                meta: {
                  publishedCount,
                  draftCount,
                  hasPublished,
                  loading: false,
                },
              };
            } catch (err) {
              console.warn(`Could not load exam question count for exam ${eId}:`, err);
              return {
                examId: eId,
                meta: {
                  publishedCount: 0,
                  draftCount: 0,
                  hasPublished: item.exam?.status === "published",
                  loading: false,
                },
              };
            }
          }),
        ).then((results) => {
          setExamMetaMap((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              if (r) {
                next[r.examId] = r.meta;
              }
            });
            return next;
          });
        });
      }
    } catch (err) {
      message.error(getErrorMessage(err, "Không thể tải chi tiết giáo trình"));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectCurriculum = (curr: Curriculum) => {
    setSelectedCurriculumId(curr.id);
    loadCurriculumDetail(curr.id);
  };

  const handleBackToList = () => {
    setSelectedCurriculumId(null);
    setCurriculumDetail(null);
  };

  // Load exam preview details
  const loadExamPreview = async (examId: string) => {
    try {
      setLoadingExam(true);
      const res = await learningCmsService.exams.get(examId);
      setPreviewExam(res);
      setActivePreviewTab("draft");

      // Asynchronously fetch full question details (options, correct answer, level) for draft questions
      const qList = res.questions || (res as any).examQuestions || [];
      if (Array.isArray(qList) && qList.length > 0) {
        const questionIdsToFetch = Array.from(
          new Set(
            qList
              .map((item: any) => item.questionId || item.question?.id || item.id)
              .filter(Boolean),
          ),
        );

        Promise.all(
          questionIdsToFetch.map(async (qId: string) => {
            try {
              const fullQ = await learningCmsService.questions.get(qId);
              return { qId, data: fullQ };
            } catch (err) {
              console.warn(`Could not load full question details for ${qId}:`, err);
              return null;
            }
          }),
        ).then((results) => {
          setFullQuestionsMap((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              if (r) {
                next[r.qId] = r.data;
              }
            });
            return next;
          });
        });
      }

      // If current published version exists, load it
      if (res.currentVersionId) {
        loadPublishedVersion(res.id, res.currentVersionId);
      } else {
        setPublishedQuestions([]);
      }
    } catch (err) {
      message.error(getErrorMessage(err, "Không thể tải nội dung đề thi"));
    } finally {
      setLoadingExam(false);
    }
  };

  const loadPublishedVersion = async (examId: string, versionId: string) => {
    try {
      setLoadingPublished(true);
      const res = await learningCmsService.exams.getVersion(examId, versionId);
      setPublishedQuestions(res.questions || []);
    } catch (err) {
      console.warn("Could not load published version questions:", err);
      setPublishedQuestions([]);
    } finally {
      setLoadingPublished(false);
    }
  };

  const handleOpenExamPreview = (exam: Exam) => {
    setPreviewExamId(exam.id);
    loadExamPreview(exam.id);
  };

  const handleClosePreview = () => {
    setPreviewExamId(null);
    setPreviewExam(null);
    setPublishedQuestions([]);
    setFullQuestionsMap({});
  };

  // Automatically refresh preview and question cache when a question is saved in QuestionFormModal
  useEffect(() => {
    if (lastSavedQuestion && previewExamId) {
      // 1. Instantly re-fetch full question details
      learningCmsService.questions
        .get(lastSavedQuestion.id)
        .then((updatedQ) => {
          setFullQuestionsMap((prev) => ({
            ...prev,
            [lastSavedQuestion.id]: updatedQ,
          }));
        })
        .catch((err) => {
          console.warn("Could not reload updated question details:", err);
        });

      // 2. Reload preview exam to refresh hasUnpublishedChanges, questions order, etc.
      loadExamPreview(previewExamId);

      // 3. Reload curriculum detail to refresh question counts
      if (selectedCurriculumId) {
        loadCurriculumDetail(selectedCurriculumId);
      }
    }
  }, [lastSavedQuestion]);

  // Publish exam handler
  const [publishing, setPublishing] = useState(false);
  const handlePublishExam = async () => {
    if (!previewExam) return;
    try {
      setPublishing(true);
      await learningCmsService.exams.updateStatus(previewExam.id, {
        status: "published",
        expectedUpdatedAt: previewExam.updatedAt,
      });
      message.success("Xuất bản đề thi thành công! Phiên bản mới đã sẵn sàng cho học sinh.");
      // Reload exam preview and curriculum
      await loadExamPreview(previewExam.id);
      if (selectedCurriculumId) {
        loadCurriculumDetail(selectedCurriculumId);
      }
      onRefreshParent?.();
    } catch (err) {
      message.error(getErrorMessage(err, "Xuất bản đề thi thất bại"));
    } finally {
      setPublishing(false);
    }
  };

  // Quick edit question
  const handleOpenQuickEdit = (q: any) => {
    const qObj = q.question || {};
    const realId = q.questionId || qObj.id || q.id;
    const realQ = {
      ...qObj,
      ...q,
      id: realId,
      questionId: realId,
    };

    if (onOpenQuestionFullEdit) {
      onOpenQuestionFullEdit(realQ);
      return;
    }
    setEditingQuestion(realQ);
    questionForm.setFieldsValue({
      prompt: realQ.prompt || realQ.snapshot?.prompt || "",
      explanation: realQ.explanation || realQ.feedback?.explanation || realQ.snapshot?.explanation || "",
      options: realQ.options || realQ.snapshot?.options || [],
    });
    setQuickEditModalOpen(true);
  };

  const handleSaveQuickEdit = async () => {
    if (!editingQuestion || !previewExam) return;
    try {
      setSubmittingQuestion(true);
      const values = await questionForm.validateFields();

      const payload: any = {
        prompt: values.prompt,
        explanation: values.explanation,
        expectedUpdatedAt: editingQuestion.updatedAt,
      };

      if (values.options && Array.isArray(values.options) && values.options.length > 0) {
        payload.options = values.options.map((opt: any, idx: number) => ({
          ...opt,
          orderIndex: idx,
          label: String.fromCharCode(65 + idx),
        }));
      }

      await learningCmsService.questions.update(editingQuestion.id || editingQuestion.questionId, payload);
      message.success("Cập nhật câu hỏi thành công!");
      setQuickEditModalOpen(false);
      setEditingQuestion(null);

      // Reload exam preview to show updated draft questions
      await loadExamPreview(previewExam.id);
    } catch (err: any) {
      if (err.errorFields) return; // Form validation error
      message.error(getErrorMessage(err, "Không thể lưu cập nhật câu hỏi"));
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Transform draft question into ExamVersionQuestionDetail format for ExamVersionQuestionCard
  const adaptQuestionToVersionDetail = (q: any, index: number): ExamVersionQuestionDetail => {
    const qObj = q.question || {};
    const realId = q.questionId || qObj.id || q.id;
    const fullQ = fullQuestionsMap[realId] || {};

    const rawOptions =
      fullQ.options ||
      q.options ||
      qObj.options ||
      fullQ.detail?.options ||
      q.detail?.options ||
      qObj.detail?.options ||
      [];
    const correctOptionIds = rawOptions
      .filter((o: any) => o.isCorrect)
      .map((o: any) => o.id || o.label || o.content);

    const promptText = fullQ.prompt ?? q.prompt ?? qObj.prompt ?? "";
    const questionType = fullQ.type ?? q.type ?? qObj.type ?? "multiple_choice";
    const questionMedia = fullQ.media ?? q.media ?? qObj.media ?? [];
    const questionDetail = fullQ.detail ?? q.detail ?? qObj.detail;
    const questionExplanation = fullQ.explanation ?? q.explanation ?? qObj.explanation;

    const pubMatch = publishedQuestions.find(
      (pq) => (pq.questionId || pq.id) === realId
    );
    const versionNumber =
      q.versionNumber ||
      qObj.versionNumber ||
      pubMatch?.versionNumber ||
      fullQ.versionNumber ||
      1;

    return {
      id: realId,
      questionId: realId,
      versionNumber,
      type: questionType,
      orderIndex: q.orderIndex ?? qObj.orderIndex ?? index + 1,
      snapshot: {
        prompt: promptText,
        options: rawOptions,
        pairs: fullQ.pairs || q.pairs || qObj.pairs || questionDetail?.pairs,
        detail: questionDetail,
        feedback: fullQ.feedback || q.feedback || qObj.feedback || { explanation: questionExplanation },
        explanation: questionExplanation,
        instruction: fullQ.instruction ?? q.instruction ?? qObj.instruction,
        media: questionMedia.map((m: any) => {
          const mediaAsset = m.media || m;
          const role =
            m.role ||
            fullQ.mediaIds?.find((mid: any) => mid.mediaId === (m.mediaId || m.id))?.role ||
            q.mediaIds?.find((mid: any) => mid.mediaId === (m.mediaId || m.id))?.role ||
            qObj.mediaIds?.find((mid: any) => mid.mediaId === (m.mediaId || m.id))?.role ||
            (mediaAsset?.type === "audio" || m.type === "audio" ? "prompt_audio" : "prompt_image");
          return {
            id: m.id || mediaAsset?.id,
            role,
            media: mediaAsset,
          };
        }),
        passage: fullQ.readingPassage || q.readingPassage || q.passage || qObj.readingPassage || qObj.passage,
      },
      correctAnswer:
        fullQ.correctAnswer ||
        q.correctAnswer ||
        qObj.correctAnswer ||
        (correctOptionIds.length > 0 ? { correctOptionIds } : questionDetail?.correctAnswer),
      feedback: {
        explanation: questionExplanation,
      },
    };
  };

  // Extract draft questions from previewExam
  const draftQuestions: any[] = useMemo(() => {
    if (!previewExam) return [];
    const rawList = previewExam.questions || previewExam.examQuestions || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any, idx: number) => {
      const qObj = item.question || {};
      const realId = item.questionId || qObj.id || item.id;
      return {
        ...qObj,
        ...item,
        id: realId,
        questionId: realId,
        mappingId: item.id,
        prompt: qObj.prompt ?? item.prompt,
        type: qObj.type ?? item.type,
        options: qObj.options ?? item.options,
        detail: qObj.detail ?? item.detail,
        explanation: qObj.explanation ?? item.explanation,
        media: qObj.media ?? item.media,
        mediaIds: qObj.mediaIds ?? item.mediaIds,
        readingPassage: qObj.readingPassage ?? item.readingPassage,
        passage: qObj.passage ?? item.passage,
        orderIndex: item.orderIndex ?? qObj.orderIndex ?? idx + 1,
        score: item.score ?? qObj.score ?? 1,
      };
    });
  }, [previewExam]);

  // Curriculums table columns
  const curriculumColumns = [
    {
      title: "Mã giáo trình",
      dataIndex: "code",
      key: "code",
      width: 170,
      render: (code: string) => (
        <Tooltip title={code || "—"}>
          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap inline-block max-w-[150px] truncate">
            {code || "—"}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Tên giáo trình",
      dataIndex: "title",
      key: "title",
      minWidth: 260,
      render: (title: string, record: Curriculum) => (
        <div className="max-w-[340px]">
          <Tooltip title={title} placement="topLeft">
            <a
              onClick={() => handleSelectCurriculum(record)}
              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm cursor-pointer block truncate"
            >
              {title}
            </a>
          </Tooltip>
          {record.description && (
            <Tooltip title={record.description} placement="topLeft">
              <span className="text-slate-400 text-xs block truncate mt-0.5">
                {record.description}
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: ["level", "name"],
      key: "level",
      width: 130,
      align: "center" as const,
      render: (levelName: string) =>
        levelName ? (
          <Tooltip title={levelName}>
            <Tag color="cyan" className="rounded-full px-2.5 font-medium whitespace-nowrap">
              {levelName}
            </Tag>
          </Tooltip>
        ) : (
          <span className="text-slate-400 text-xs whitespace-nowrap">—</span>
        ),
    },
    {
      title: "Tổng số đề",
      key: "examsCount",
      width: 110,
      align: "center" as const,
      render: (_: any, record: any) => {
        const count = record.examCount ?? record.examsCount ?? (record.exams?.length || 0);
        return (
          <span className="inline-flex items-center justify-center gap-1.5 font-extrabold text-slate-800 text-sm whitespace-nowrap">
            <BookOutlined className="text-indigo-500" />
            {count}
          </span>
        );
      },
    },
    {
      title: "Cơ cấu đề",
      key: "structure",
      width: 220,
      align: "center" as const,
      render: (_: any, record: any) => {
        const testCount = record.testCount ?? 0;
        const practiceCount = record.practiceCount ?? 0;
        return (
          <div className="flex items-center justify-center gap-2 whitespace-nowrap">
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 shrink-0">
              Kiểm tra: {testCount}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shrink-0">
              Ôn tập: {practiceCount}
            </span>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      align: "center" as const,
      render: (status: string) =>
        status === "published" ? (
          <Tag color="success" className="rounded-full font-bold px-2.5 whitespace-nowrap">
            Đã phát hành
          </Tag>
        ) : (
          <Tag color="default" className="rounded-full font-semibold px-2.5 whitespace-nowrap">
            Bản nháp
          </Tag>
        ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 140,
      align: "center" as const,
      render: (_: any, record: Curriculum) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleSelectCurriculum(record)}
          className="rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-xs whitespace-nowrap"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  // ==========================================
  // VIEW: SINGLE CURRICULUM DETAIL (EXAMS LIST)
  // ==========================================
  if (selectedCurriculumId && curriculumDetail) {
    const examsInCurriculum = (curriculumDetail.exams || [])
      .slice()
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    return (
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBackToList}
              className="rounded-xl border-slate-200 hover:border-indigo-400 font-semibold text-slate-700"
            >
              Quay lại danh sách giáo trình
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {curriculumDetail.code}
                </span>
                <Title level={4} className="!mb-0 !text-slate-900 font-extrabold">
                  {curriculumDetail.title}
                </Title>
                {curriculumDetail.status === "published" ? (
                  <Tag color="success" className="rounded-full font-bold">
                    Đã phát hành
                  </Tag>
                ) : (
                  <Tag color="default" className="rounded-full font-semibold">
                    Bản nháp
                  </Tag>
                )}
              </div>
              {curriculumDetail.description && (
                <Text className="text-slate-500 text-xs mt-1 block">
                  {curriculumDetail.description}
                </Text>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadCurriculumDetail(curriculumDetail.id)}
              loading={loadingDetail}
              className="rounded-xl font-semibold"
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Exams List in Curriculum */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileTextOutlined className="text-indigo-600" />
                Danh sách đề thi theo lộ trình ({examsInCurriculum.length} đề)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem trực tiếp các câu hỏi và đáp án của đề thi giống như học sinh nhìn thấy mà không cần phải giao đề thi thử.
              </p>
            </div>
          </div>

          {loadingDetail ? (
            <div className="py-16 text-center">
              <Spin size="large" />
            </div>
          ) : examsInCurriculum.length === 0 ? (
            <div className="py-16 text-center">
              <Empty description="Giáo trình này chưa có đề thi nào." />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {examsInCurriculum.map((item, index) => {
                const exam = item.exam || ({} as Exam);
                const isExam = exam.examType === "exam";
                const hasUnpublished = exam.hasUnpublishedChanges;

                return (
                  <div
                    key={item.examId || index}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start gap-4">
                      {/* Step index badge */}
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-700 text-sm shrink-0">
                        #{item.orderIndex != null ? item.orderIndex + 1 : index + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">
                            {exam.title || "Chưa đặt tên"}
                          </span>
                          {exam.code && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {exam.code}
                            </span>
                          )}
                          <Tag
                            color={isExam ? "warning" : "processing"}
                            className="rounded-full font-bold px-2.5 text-xs"
                          >
                            {isExam ? "Bài kiểm tra" : "Bài ôn tập"}
                          </Tag>
                          {exam.status === "published" ? (
                            <Tag color="success" className="rounded-full font-bold px-2.5 text-xs">
                              Đã phát hành
                            </Tag>
                          ) : (
                            <Tag color="default" className="rounded-full font-semibold px-2.5 text-xs">
                              Bản nháp
                            </Tag>
                          )}
                          {hasUnpublished && (
                            <Tag color="error" className="rounded-full font-bold px-2.5 text-xs">
                              Có thay đổi chưa xuất bản
                            </Tag>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <ClockCircleOutlined className="text-slate-400" />
                            {exam.timeLimitSeconds
                              ? `${Math.round(exam.timeLimitSeconds / 60)} phút`
                              : "Không giới hạn thời gian"}
                          </span>
                          {(() => {
                            const meta = examMetaMap[item.examId || exam.id];
                            if (meta?.loading) {
                              return (
                                <span className="flex items-center gap-1.5 text-slate-400">
                                  <QuestionCircleOutlined />
                                  <Spin size="small" />
                                  <span>Đang kiểm tra câu hỏi...</span>
                                </span>
                              );
                            }

                            const hasPublishedVersion = meta
                              ? meta.hasPublished
                              : exam.status === "published" || !!exam.currentVersionId;
                            const currentCount = meta
                              ? meta.publishedCount
                              : exam.questionCount ?? (exam as any).questionsCount ?? 0;
                            const draftCount = meta
                              ? meta.draftCount
                              : exam.questions?.length ?? 0;

                            if (hasPublishedVersion) {
                              return (
                                <span className="flex items-center gap-1">
                                  <QuestionCircleOutlined className="text-emerald-500" />
                                  <strong className="text-slate-800 font-bold">{currentCount}</strong>{" "}
                                  câu hỏi (hiện tại)
                                  {draftCount > 0 && draftCount !== currentCount && (
                                    <span className="text-amber-600 text-[11px] font-medium ml-1">
                                      • {draftCount} câu đang soạn
                                    </span>
                                  )}
                                </span>
                              );
                            }

                            // If not published yet (draft only)
                            return (
                              <span className="flex items-center gap-1">
                                <QuestionCircleOutlined className="text-slate-400" />
                                <strong className="text-slate-700 font-bold">
                                  {draftCount || currentCount || 0}
                                </strong>{" "}
                                câu hỏi (bản nháp)
                              </span>
                            );
                          })()}
                          {item.isRequired && (
                            <span className="text-red-500 font-semibold">• Bắt buộc</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => handleOpenExamPreview(exam)}
                        className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 h-10 px-4 shadow-sm w-full sm:w-auto"
                      >
                        Xem trước & Sửa đề
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* EXAM PREVIEW DRAWER (STUDENT PREVIEW + INLINE EDIT) */}
        {/* ==================================================== */}
        <Drawer
          open={!!previewExamId}
          onClose={handleClosePreview}
          width={typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 920}
          title={
            previewExam ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileTextOutlined />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      {previewExam.title}
                      {previewExam.hasUnpublishedChanges && (
                        <Tag color="error" className="rounded-full font-bold text-xs">
                          Chưa xuất bản bản mới
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-normal">
                      Mã: {previewExam.code} • Loại: {previewExam.examType === "exam" ? "Kiểm tra" : "Ôn tập"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Popconfirm
                    title="Xuất bản đề thi này?"
                    description="Học sinh sẽ nhận phiên bản mới nhất của đề thi này khi làm bài."
                    okText="Xuất bản ngay"
                    cancelText="Hủy"
                    onConfirm={handlePublishExam}
                  >
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      loading={publishing}
                      className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm"
                    >
                      Xuất bản đề thi
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            ) : (
              "Đang tải đề thi..."
            )
          }
          className="rounded-l-2xl"
        >
          {loadingExam ? (
            <div className="py-24 text-center">
              <Spin size="large" />
              <div className="mt-3 text-slate-500 font-medium">Đang tải câu hỏi xem trước...</div>
            </div>
          ) : !previewExam ? (
            <Empty description="Không tìm thấy thông tin đề thi" />
          ) : (
            <div className="space-y-4">
              <Alert
                type="info"
                showIcon
                className="rounded-xl border-blue-200"
                message={
                  <span className="font-bold text-slate-800">
                    Chế độ xem trước dành cho Giáo viên / Admin
                  </span>
                }
                description="Hệ thống hiển thị câu hỏi và đáp án chính xác giống hệt giao diện làm bài của học sinh. Bạn có thể bấm 'Sửa câu hỏi' trực tiếp để cập nhật nội dung mà không cần giao bài thử."
              />

              <Tabs
                activeKey={activePreviewTab}
                onChange={(key) => setActivePreviewTab(key as any)}
                type="card"
                items={[
                  {
                    key: "draft",
                    label: (
                      <span className="font-bold flex items-center gap-1.5 px-1">
                        <EditOutlined />
                        Bản đang soạn ({draftQuestions.length} câu)
                        {previewExam.hasUnpublishedChanges && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        )}
                      </span>
                    ),
                    children: (
                      <div className="space-y-5 pt-2">
                        {draftQuestions.length === 0 ? (
                          <div className="py-16 text-center">
                            <Empty description="Đề thi này chưa có câu hỏi nào trong bản soạn." />
                          </div>
                        ) : (
                          draftQuestions.map((q, idx) => {
                            const versionDetail = adaptQuestionToVersionDetail(q, idx);
                            return (
                              <div
                                key={q.id || idx}
                                className="relative rounded-2xl border border-slate-200 bg-slate-50/40 p-4 transition-all hover:border-indigo-300 hover:shadow-sm"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    {(() => {
                                      const fullQ = fullQuestionsMap[q.questionId || q.id];
                                      const levelName = fullQ?.level?.name || fullQ?.difficultyLevel?.name || q.level?.name;
                                      if (levelName) {
                                        return (
                                          <Tag color="cyan" className="rounded-full text-xs font-medium">
                                            Độ khó: {levelName}
                                          </Tag>
                                        );
                                      }
                                      if (q.difficultyLevelId && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(q.difficultyLevelId)) {
                                        return (
                                          <Tag color="cyan" className="rounded-full text-xs font-medium">
                                            Độ khó: {q.difficultyLevelId}
                                          </Tag>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleOpenQuickEdit(q)}
                                    className="rounded-lg font-bold text-indigo-600 border-indigo-200 hover:border-indigo-400 bg-white shadow-2xs"
                                  >
                                    Sửa câu hỏi
                                  </Button>
                                </div>

                                <ExamVersionQuestionCard question={versionDetail} index={idx} />
                              </div>
                            );
                          })
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "published",
                    label: (
                      <span className="font-bold flex items-center gap-1.5 px-1">
                        <CheckCircleOutlined />
                        Bản đã phát hành
                        {previewExam.currentVersionId ? (
                          <>
                            {loadingPublished ? (
                              <span className="text-slate-400 font-normal text-xs">(...)</span>
                            ) : (
                              <span>({publishedQuestions.length} câu)</span>
                            )}
                            <Tag color="success" className="ml-1 rounded-full text-[10px] px-1.5">
                              Hiện tại
                            </Tag>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">(Chưa xuất bản)</span>
                        )}
                      </span>
                    ),
                    children: (
                      <div className="space-y-5 pt-2">
                        {!previewExam.currentVersionId ? (
                          <div className="py-16 text-center">
                            <Empty description="Đề thi chưa từng được xuất bản. Hãy bấm 'Xuất bản đề thi' ở góc trên để tạo phiên bản đầu tiên." />
                          </div>
                        ) : loadingPublished ? (
                          <div className="py-16 text-center">
                            <Spin />
                            <div className="mt-2 text-xs text-slate-400">Đang tải bản đã phát hành...</div>
                          </div>
                        ) : publishedQuestions.length === 0 ? (
                          <div className="py-16 text-center">
                            <Empty description="Không có câu hỏi nào trong phiên bản đã phát hành." />
                          </div>
                        ) : (
                          publishedQuestions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4"
                            >
                              <ExamVersionQuestionCard question={q} index={idx} />
                            </div>
                          ))
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Drawer>

        {/* Quick Question Edit Modal */}
        <Modal
          open={quickEditModalOpen}
          onCancel={() => {
            setQuickEditModalOpen(false);
            setEditingQuestion(null);
          }}
          onOk={handleSaveQuickEdit}
          confirmLoading={submittingQuestion}
          title={
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
              <EditOutlined />
              Chỉnh sửa nhanh câu hỏi
            </div>
          }
          width={680}
          okText="Lưu thay đổi"
          cancelText="Hủy"
          centered
        >
          <Form form={questionForm} layout="vertical" className="pt-2">
            <Form.Item
              name="prompt"
              label="Đề bài / Câu hỏi"
              rules={[{ required: true, message: "Vui lòng nhập đề bài" }]}
            >
              <Input.TextArea rows={3} placeholder="Nhập nội dung câu hỏi..." className="rounded-xl font-medium" />
            </Form.Item>

            {/* If options exist (e.g. multiple choice), show options list */}
            {editingQuestion?.options && editingQuestion.options.length > 0 && (
              <Form.Item label="Danh sách đáp án lựa chọn">
                <Form.List name="options">
                  {(fields) => (
                    <div className="space-y-3">
                      {fields.map((field, idx) => (
                        <div
                          key={field.key}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70"
                        >
                          <span className="font-extrabold text-slate-700 w-6">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <Form.Item
                            {...field}
                            name={[field.name, "content"]}
                            noStyle
                            rules={[{ required: true, message: "Nhập nội dung đáp án" }]}
                          >
                            <Input placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`} className="rounded-lg font-medium" />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, "isCorrect"]}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch checkedChildren="Đúng" unCheckedChildren="Sai" />
                          </Form.Item>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            )}

            <Form.Item name="explanation" label="Giải thích chi tiết (Feedback)">
              <Input.TextArea
                rows={3}
                placeholder="Nhập giải thích vì sao đáp án đúng..."
                className="rounded-xl font-medium"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW: ALL CURRICULUMS LIST
  // ==========================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs">
        <div>
          <Title level={4} className="!mb-1 !text-slate-900 font-extrabold tracking-tight">
            Tổng quan Giáo trình & Lộ trình đề thi
          </Title>
          <Text className="text-slate-500 text-xs sm:text-sm block">
            Xem trước nội dung các đề thi trong từng giáo trình giống như học sinh nhìn thấy. Chỉnh sửa câu hỏi và phát hành đề thi trực tiếp.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefreshParent}
          loading={loading}
          className="rounded-xl font-semibold self-start sm:self-center"
        >
          Làm mới
        </Button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-3 sm:p-6 shadow-xs overflow-hidden">
        {isMobile ? (
          <ColumnCards columns={curriculumColumns} rows={curriculums} loading={loading} pagination={pagination} headingCount={2} emptyText="Chưa có giáo trình nào" />
        ) : (
          <Table
            columns={curriculumColumns}
            dataSource={curriculums}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            scroll={{ x: 1100 }}
            className="rounded-2xl overflow-hidden"
          />
        )}
      </div>
    </div>
  );
};

export default CurriculumOverviewTab;
