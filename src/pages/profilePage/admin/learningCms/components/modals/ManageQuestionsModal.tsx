import { useServerPagination } from "../../../../../../hooks/useServerPagination";
import { ServerSelect } from "../../../../../../components/ServerSelect";
import { useState, useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Segmented,
  Tag,
  Tooltip,
  message,
  Pagination,
  Alert,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  SendOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { AlertCircle, AlertTriangle, Search, ClipboardList } from "lucide-react";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS, QUESTION_TYPES } from "../../constants";
import { QuestionPopover } from "../QuestionPopoverContent";
import QuestionRowItem from "../QuestionRowItem";
import { learningCmsService } from "../../../../../../services/learningCmsService";
import { Can } from "../../../../../../components/Can";
import { getErrorMessage } from "../../../../../../services/apiClient";
import { RandomQuestionCriteria } from "../../../../../../types/learning";

// ── Types ────────────────────────────────────────────────────

interface TaxItem { id: string; name: string; }

interface QuestionOption {
  label?: string;
  content: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  specializationId?: string;
  prompt?: string;
  type: string;
  status: string;
  skillId?: string;
  difficultyLevelId?: string;
  topicId?: string;
  tagIds?: string[];
  instruction?: string;
  explanation?: string;
  options?: QuestionOption[];
  detail?: Record<string, any>;
}

interface ExamQuestion {
  questionId: string;
}

interface Exam {
  id: string;
  specializationId?: string;
  title: string;
  status: string;
  updatedAt?: string;
  questions?: ExamQuestion[];
}

interface Props {
  open:          boolean;
  selectedExam:  Exam | null;
  onCancel:      () => void;
  onDone:        () => void;

  /** All questions in the question bank */
  allQuestions:     Question[];
  /** Cached full question details (for popover) */
  questionDetails:  Record<string, any>;

  skills: TaxItem[];
  levels: TaxItem[];
  topics: TaxItem[];
  tags:   TaxItem[];

  // Filter state (lifted up to parent to preserve between renders)
  examQSearch:       string;
  onExamQSearch:     (v: string) => void;
  examQTypeFilter:   string | undefined;
  onExamQTypeFilter: (v: string | undefined) => void;
  examQSkillFilter:  string | undefined;
  onExamQSkillFilter:(v: string | undefined) => void;
  examQLevelFilter:  string | undefined;
  onExamQLevelFilter:(v: string | undefined) => void;
  examQTopicFilter:  string | undefined;
  onExamQTopicFilter:(v: string | undefined) => void;
  examQTagFilter:    string | undefined;
  onExamQTagFilter:  (v: string | undefined) => void;
  onResetFilters:    () => void;

  onAddQuestion:    (questionId: string) => Promise<void> | void;
  onRemoveQuestion: (questionId: string) => void;
  onReorder:        (index: number, direction: "up" | "down") => void;
  onRepublish:      () => void;
  onBulkAttach?:    (items: { questionId: string; orderIndex?: number }[]) => Promise<void>;
}

// ── Filter helpers ────────────────────────────────────────────

// ── Component ────────────────────────────────────────────────

/**
 * Dual-pane modal for configuring which questions belong to an exam.
 * Left pane: current exam questions (ordered, with reorder + remove).
 * Right pane: available published questions with filter panel and add button.
 */
export default function ManageQuestionsModal({
  open,
  selectedExam,
  onCancel,
  onDone,
  allQuestions,
  questionDetails,
  skills,
  levels,
  topics,
  tags,
  examQSearch,
  onExamQSearch,
  examQTypeFilter,
  onExamQTypeFilter,
  examQSkillFilter,
  onExamQSkillFilter,
  examQLevelFilter,
  onExamQLevelFilter,
  examQTopicFilter,
  onExamQTopicFilter,
  examQTagFilter,
  onExamQTagFilter,
  onResetFilters,
  onAddQuestion,
  onRemoveQuestion,
  onReorder,
  onRepublish,
  onBulkAttach,
}: Props) {
  const examQuestions = selectedExam?.questions ?? [];

  // Tab mode: "manual" (manual pick from question bank) | "random" (random criteria & bulk attach)
  const [tabMode, setTabMode] = useState<"manual" | "random">("manual");

  // Random criteria state
  interface CriteriaItem {
    id: string;
    count: number;
    type?: string;
    skillId?: string;
    levelId?: string;
    topicId?: string;
    tagId?: string;
  }

  const [criteriaList, setCriteriaList] = useState<CriteriaItem[]>([
    { id: "1", count: 5, type: undefined, skillId: undefined, levelId: undefined, topicId: undefined, tagId: undefined },
  ]);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [isBulkAttaching, setIsBulkAttaching] = useState(false);
  const [addingQuestionId, setAddingQuestionId] = useState<string | null>(null);
  const [randomResult, setRandomResult] = useState<{
    totalCount: number;
    items: Array<{ questionId: string; orderIndex: number }>;
    groups: Array<{
      index: number;
      filters: Record<string, unknown>;
      requested: number;
      returned: number;
      questions: Array<{
        orderIndex: number;
        id: string;
        prompt: string;
        type: string;
        options: unknown[];
      }>;
    }>;
  } | null>(null);

  const hasActiveFilters = !!(
    examQSearch || examQTypeFilter || examQSkillFilter ||
    examQLevelFilter || examQTopicFilter || examQTagFilter
  );

  const availablePage = useServerPagination<Question>("/learning/questions", {
    specializationId: selectedExam?.specializationId, status: "published", excludeExamId: selectedExam?.id,
    search: examQSearch || undefined, type: examQTypeFilter, skillId: examQSkillFilter,
    levelId: examQLevelFilter, topicId: examQTopicFilter, tagIds: examQTagFilter,
  }, 10, open && !!selectedExam && tabMode === "manual");
  const available = availablePage.data;

  const getQuestionObj = (questionId: string) => {
    const q = allQuestions.find((allQ) => allQ.id === questionId);
    let groupQ: any = null;
    for (const grp of randomResult?.groups || []) {
      const matched = grp.questions?.find((gq: any) => gq.id === questionId);
      if (matched) {
        groupQ = matched;
        break;
      }
    }
    const cached = questionDetails[questionId];
    if (!q && !groupQ && !cached) return undefined;
    return {
      ...(groupQ ?? {}),
      ...(q ?? {}),
      ...(cached ?? {}),
    };
  };

  const mismatchedQuestions = useMemo(() => {
    if (!randomResult || !selectedExam?.specializationId) return [];
    return randomResult.items.filter((item) => {
      const qObj = getQuestionObj(item.questionId);
      return (
        qObj?.specializationId &&
        selectedExam.specializationId &&
        qObj.specializationId !== selectedExam.specializationId
      );
    });
  }, [randomResult, selectedExam, allQuestions, questionDetails]);

  const handleFetchRandom = async () => {
    try {
      setIsRandomLoading(true);
      const payloadCriteria: RandomQuestionCriteria[] = criteriaList.map((c) => ({
        count: c.count || 1,
        type: (c.type as any) || undefined,
        skillId: c.skillId || undefined,
        levelId: c.levelId || undefined,
        topicId: c.topicId || undefined,
        tagId: c.tagId || undefined,
      }));

      const res = await learningCmsService.exams.randomQuestions(
        { criteria: payloadCriteria },
        selectedExam?.id,
      );
      setRandomResult(res);
      if (res.totalCount === 0) {
        message.warning("Không tìm thấy câu hỏi nào phù hợp với tiêu chí đã chọn");
      } else {
        message.success(`Đã lấy ngẫu nhiên ${res.totalCount} câu hỏi (Preview)`);
      }
    } catch (err: any) {
      message.error(getErrorMessage(err, "Lỗi khi lấy câu hỏi ngẫu nhiên"));
    } finally {
      setIsRandomLoading(false);
    }
  };

  const handleBulkAttach = async () => {
    if (!selectedExam || !randomResult || randomResult.items.length === 0) return;

    if (mismatchedQuestions.length > 0) {
      message.error(
        `Không thể gắn: Có ${mismatchedQuestions.length} câu hỏi không thuộc cùng môn học với bài thi (${selectedExam.title}). Vui lòng chọn Kỹ năng hoặc Chủ đề cụ thể để tạo câu hỏi đúng môn!`
      );
      return;
    }

    try {
      setIsBulkAttaching(true);
      const existingIndices = new Set(
        examQuestions
          .map((eq: any) => Number(eq.orderIndex))
          .filter((n: number) => !isNaN(n))
      );
      let nextIdx = examQuestions.length;
      if (existingIndices.size > 0) {
        const maxIdx = Math.max(...Array.from(existingIndices));
        nextIdx = Math.max(maxIdx + 1, examQuestions.length);
      }
      const items = randomResult.items.map((item) => {
        while (existingIndices.has(nextIdx)) {
          nextIdx++;
        }
        const assignedOrder = nextIdx;
        existingIndices.add(assignedOrder);
        nextIdx++;
        return {
          questionId: item.questionId,
          orderIndex: assignedOrder,
        };
      });

      if (onBulkAttach) {
        await onBulkAttach(items);
      } else {
        await learningCmsService.exams.bulkAttachQuestions(selectedExam.id, { items });
        message.success(`Đã thêm ${items.length} câu hỏi vào đề thi thành công!`);
      }
      setRandomResult(null);
    } catch (err: any) {
      message.error(getErrorMessage(err, "Lỗi khi gắn câu hỏi hàng loạt"));
    } finally {
      setIsBulkAttaching(false);
    }
  };

  return (
    <Modal
      title={
        <div>
          <div className="font-bold text-slate-800">Cấu hình câu hỏi cho đề thi</div>
          <div className="text-sm text-slate-400 font-normal mt-0.5">{selectedExam?.title}</div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      maskClosable={false}
      centered
      width={1000}
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <AlertCircle size={13} className="text-amber-500 shrink-0" />
            <span>Chỉ câu hỏi đã được <strong>Duyệt (published)</strong> mới có thể thêm vào đề thi</span>
          </div>
          <Button type="primary" onClick={onDone}>Hoàn tất</Button>
        </div>
      }
      className="rounded-2xl"
    >
      {/* Published-exam warning banner */}
      {selectedExam?.status === "published" && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex justify-between items-center gap-3">
          <div className="leading-relaxed flex items-start gap-1.5">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý:</strong> Đề thi này đang ở trạng thái <strong>Đang phát hành</strong>.
              Các thay đổi về câu hỏi sẽ không tự động áp dụng cho học sinh đã giao cho đến khi bạn{" "}
              <strong>Xuất bản phiên bản mới</strong>.
            </div>
          </div>
          <Can perform="learning.publish">
          <Button
            type="primary"
            size="small"
            danger
            icon={<SendOutlined />}
            onClick={onRepublish}
            className="font-semibold text-xs flex-shrink-0"
          >
            Xuất bản bản mới
          </Button>
          </Can>
        </div>
      )}

      {tabMode === "manual" && <div className="mb-3 flex justify-end"><Pagination {...availablePage.pagination} /></div>}
      {availablePage.error && <Alert type="error" message={availablePage.error.message} />}
      <Row gutter={24} className="pt-2">
        {/* Left: current questions */}
        <Col span={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Câu hỏi trong đề thi</span>
                <Badge count={examQuestions.length} color="indigo" />
              </div>
            }
            className="rounded-2xl border-slate-100 shadow-sm"
            size="small"
          >
            <List
              style={{ maxHeight: 460, overflowY: "auto" }}
              dataSource={examQuestions}
              renderItem={(eq: ExamQuestion, index) => {
                const q = allQuestions.find((q) => q.id === eq.questionId);
                const detail = q
                  ? { ...q, ...(questionDetails[q.id] ?? {}) }
                  : questionDetails[eq.questionId] ?? { id: eq.questionId };
                return (
                  <List.Item
                    actions={[
                      <Button type="text" size="small" disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => onReorder(index, "up")} />,
                      <Button type="text" size="small" disabled={index === examQuestions.length - 1} icon={<ArrowDownOutlined />} onClick={() => onReorder(index, "down")} />,
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveQuestion(eq.questionId)} />,
                    ]}
                  >
                    <QuestionPopover
                      question={detail}
                      skills={skills}
                      levels={levels}
                      topics={topics}
                      tags={tags}
                      placement="right"
                    >
                      <div className="cursor-pointer flex-1 pr-2">
                        <List.Item.Meta
                          avatar={<div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{index + 1}</div>}
                          title={
                            <div
                              className="text-xs font-semibold line-clamp-1 text-slate-800"
                              dangerouslySetInnerHTML={{ __html: q?.prompt ?? "(Câu hỏi không tìm thấy)" }}
                            />
                          }
                          description={
                            q && (
                              <Tag color={QUESTION_TYPE_COLORS[q.type]} className="text-[9px] border-none">
                                {QUESTION_TYPE_LABELS[q.type]}
                              </Tag>
                            )
                          }
                        />
                      </div>
                    </QuestionPopover>
                  </List.Item>
                );
              }}
              locale={{ emptyText: <Empty description="Đề thi chưa có câu hỏi nào" styles={{ image: { height: 40 } }} /> }}
            />
          </Card>
        </Col>

        {/* Right: available questions or random generator */}
        <Col span={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <Segmented
                  options={[
                    { label: "Chọn thủ công", value: "manual" },
                    { label: "Tạo ngẫu nhiên (Criteria)", value: "random" },
                  ]}
                  value={tabMode}
                  onChange={(v) => setTabMode(v as "manual" | "random")}
                  size="small"
                />
                {tabMode === "manual" && <Badge count={availablePage.total} color="green" />}
                {tabMode === "random" && randomResult && (
                  <Badge count={randomResult.totalCount} color="purple" overflowCount={999} />
                )}
              </div>
            }
            className="rounded-2xl border-slate-100 shadow-sm"
            size="small"
            styles={{ body: { paddingTop: 8 } }}
          >
            {tabMode === "manual" ? (
              <>
                {/* Filter panel */}
                <div className="mb-3 rounded-xl border border-indigo-100 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
                  <div className="px-3 pt-3 pb-2">
                    <Input
                      placeholder="Tìm theo đề bài, đáp án, giải thích..."
                      prefix={<Search size={13} className="text-slate-400 mr-1" />}
                      value={examQSearch}
                      onChange={(e) => onExamQSearch(e.target.value)}
                      allowClear
                      size="small"
                      style={{ borderRadius: 8, border: "1px solid #e0e7ff", background: "#fff", fontSize: 12 }}
                    />
                  </div>

                  <div className="mx-3 border-t border-slate-100" />

                  <div className="px-3 py-2 grid grid-cols-2 gap-1.5">
                    <Select placeholder="Loại câu hỏi" value={examQTypeFilter} onChange={onExamQTypeFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false}>
                      {QUESTION_TYPES.map((qt) => <Select.Option key={qt.value} value={qt.value}>{qt.label}</Select.Option>)}
                    </Select>
                    <ServerSelect endpoint="/learning/skills" placeholder="Kỹ năng" value={examQSkillFilter} onChange={onExamQSkillFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false} />
                    <ServerSelect endpoint="/learning/levels" placeholder="Cấp độ" value={examQLevelFilter} onChange={onExamQLevelFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false} />
                    <ServerSelect endpoint="/learning/topics" placeholder="Chủ đề" value={examQTopicFilter} onChange={onExamQTopicFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false} />
                    <ServerSelect endpoint="/learning/tags" placeholder="Thẻ gắn (Tag)" value={examQTagFilter} onChange={onExamQTagFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} className="col-span-2" popupMatchSelectWidth={false} />
                  </div>

                  {hasActiveFilters && (
                    <div className="mx-3 mb-2 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                      <span className="text-[11px] text-indigo-600 flex items-center gap-1">
                        <Search size={12} />
                        <span>Tìm thấy <strong>{available.length}</strong> câu hỏi</span>
                      </span>
                      <button
                        onClick={onResetFilters}
                        className="text-[11px] text-indigo-500 hover:text-indigo-700 underline underline-offset-2 bg-transparent border-none cursor-pointer p-0 font-medium"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  )}
                </div>

                {/* Question list */}
                <List
                  split={false}
                  style={{ maxHeight: 340, overflowY: "auto" }}
                  dataSource={available}
                  renderItem={(q: Question, index) => (
                    <QuestionRowItem
                      key={q.id}
                      index={index + 1}
                      question={questionDetails[q.id] ? { ...q, ...questionDetails[q.id] } : q}
                      skills={skills}
                      levels={levels}
                      topics={topics}
                      tags={tags}
                      variant="indigo"
                      placement="left"
                      action={
                        <Button
                          type="dashed"
                          size="small"
                          icon={<PlusOutlined />}
                          loading={addingQuestionId === q.id}
                          disabled={addingQuestionId !== null}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setAddingQuestionId(q.id);
                              await onAddQuestion(q.id);
                              availablePage.reload();
                            } finally {
                              setAddingQuestionId(null);
                            }
                          }}
                          className="text-xs"
                        >
                          Thêm
                        </Button>
                      }
                    />
                  )}
                  locale={{ emptyText: <Empty description="Không tìm thấy câu hỏi đã duyệt phù hợp" styles={{ image: { height: 40 } }} /> }}
                />
              </>
            ) : (
              <div style={{ maxHeight: 460, overflowY: "auto" }} className="pr-1 space-y-3">
                {/* Random Criteria configuration */}
                <div className="space-y-2">
                  {criteriaList.map((crit, idx) => (
                    <div key={crit.id} className="p-2.5 rounded-xl border border-indigo-100 bg-slate-50 relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-indigo-700">
                          Nhóm {idx + 1} {criteriaList.length > 1 && `(Tiêu chí ${idx + 1})`}
                        </span>
                        {criteriaList.length > 1 && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => setCriteriaList((prev) => prev.filter((item) => item.id !== crit.id))}
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <div className="text-[11px] text-slate-500 mb-0.5">Số lượng câu:</div>
                          <InputNumber
                            min={1}
                            max={50}
                            value={crit.count}
                            onChange={(val) => {
                              setCriteriaList((prev) =>
                                prev.map((item) => (item.id === crit.id ? { ...item, count: val || 1 } : item))
                              );
                            }}
                            size="small"
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 mb-0.5">Loại câu hỏi:</div>
                          <Select
                            placeholder="Tất cả"
                            value={crit.type}
                            onChange={(v) => {
                              setCriteriaList((prev) =>
                                prev.map((item) => (item.id === crit.id ? { ...item, type: v } : item))
                              );
                            }}
                            allowClear
                            size="small"
                            style={{ width: "100%" }}
                          >
                            {QUESTION_TYPES.map((qt) => (
                              <Select.Option key={qt.value} value={qt.value}>{qt.label}</Select.Option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 mb-0.5">Kỹ năng:</div>
                          <ServerSelect endpoint="/learning/skills"
                            placeholder="Tất cả"
                            value={crit.skillId}
                            onChange={(v) => {
                              setCriteriaList((prev) =>
                                prev.map((item) => (item.id === crit.id ? { ...item, skillId: v } : item))
                              );
                            }}
                            allowClear
                            size="small"
                            style={{ width: "100%" }}
                           />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 mb-0.5">Cấp độ:</div>
                          <ServerSelect endpoint="/learning/levels"
                            placeholder="Tất cả"
                            value={crit.levelId}
                            onChange={(v) => {
                              setCriteriaList((prev) =>
                                prev.map((item) => (item.id === crit.id ? { ...item, levelId: v } : item))
                              );
                            }}
                            allowClear
                            size="small"
                            style={{ width: "100%" }}
                           />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 mb-0.5">Chủ đề:</div>
                          <ServerSelect endpoint="/learning/topics"
                            placeholder="Tất cả"
                            value={crit.topicId}
                            onChange={(v) => {
                              setCriteriaList((prev) =>
                                prev.map((item) => (item.id === crit.id ? { ...item, topicId: v } : item))
                              );
                            }}
                            allowClear
                            size="small"
                            style={{ width: "100%" }}
                           />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 mb-0.5">Thẻ gắn (Tag):</div>
                          <ServerSelect endpoint="/learning/tags"
                            placeholder="Tất cả"
                            value={crit.tagId}
                            onChange={(v) => {
                              setCriteriaList((prev) =>
                                prev.map((item) => (item.id === crit.id ? { ...item, tagId: v } : item))
                              );
                            }}
                            allowClear
                            size="small"
                            style={{ width: "100%" }}
                           />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center gap-2 pt-1">
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setCriteriaList((prev) => [
                          ...prev,
                          { id: Date.now().toString(), count: 5, type: undefined, skillId: undefined, levelId: undefined, topicId: undefined, tagId: undefined },
                        ]);
                      }}
                      className="text-xs"
                    >
                      Thêm nhóm tiêu chí
                    </Button>

                    <Button
                      type="primary"
                      size="small"
                      icon={<SearchOutlined />}
                      loading={isRandomLoading}
                      onClick={handleFetchRandom}
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                    >
                      Xem trước (Preview)
                    </Button>
                  </div>

                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg p-2 mt-2 flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0 text-amber-500" />
                    <span>Lưu ý: Bạn nên chọn <strong>Kỹ năng</strong> hoặc <strong>Chủ đề</strong> cụ thể để câu hỏi ngẫu nhiên luôn thuộc đúng môn học của bài thi.</span>
                  </div>
                </div>

                {/* Preview list */}
                {randomResult && (
                  <div className="mt-3 p-3 rounded-xl border border-purple-200 bg-purple-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <ClipboardList size={14} className="text-purple-600" />
                        <span>Kết quả Preview: {randomResult.totalCount} câu hỏi</span>
                      </div>
                      <Tooltip
                        title={
                          mismatchedQuestions.length > 0
                            ? `Có ${mismatchedQuestions.length} câu hỏi không cùng môn học với bài thi. Vui lòng chọn Kỹ năng hoặc Chủ đề để lọc đúng môn.`
                            : undefined
                        }
                      >
                        <span>
                          <Button
                            type="primary"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            loading={isBulkAttaching}
                            disabled={randomResult.totalCount === 0 || mismatchedQuestions.length > 0}
                            onClick={handleBulkAttach}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold disabled:opacity-50"
                          >
                            Gắn {randomResult.totalCount} câu vào đề (Bulk Attach)
                          </Button>
                        </span>
                      </Tooltip>
                    </div>

                    {mismatchedQuestions.length > 0 && (
                      <div className="mb-2.5 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                        <AlertTriangle size={15} className="shrink-0 text-red-500 mt-0.5" />
                        <div>
                          <div className="font-semibold">
                            Phát hiện {mismatchedQuestions.length} câu hỏi không thuộc môn học này!
                          </div>
                          <div className="text-[11px] text-red-600 mt-0.5">
                            Bài thi yêu cầu toàn bộ câu hỏi phải cùng môn học. Do để <em>"Tất cả"</em>, hệ thống đã chọn ngẫu nhiên câu hỏi của môn khác. Hãy chọn cụ thể <strong>Kỹ năng</strong> hoặc <strong>Chủ đề</strong> của môn học để tạo lại câu hỏi.
                          </div>
                        </div>
                      </div>
                    )}

                    <List
                      split={false}
                      size="small"
                      style={{ maxHeight: 180, overflowY: "auto" }}
                      dataSource={randomResult.items}
                      renderItem={(item, index) => {
                        const questionObj = getQuestionObj(item.questionId);
                        const isMismatched = !!(
                          questionObj?.specializationId &&
                          selectedExam?.specializationId &&
                          questionObj.specializationId !== selectedExam.specializationId
                        );

                        return (
                          <QuestionRowItem
                            key={item.questionId}
                            index={index + 1}
                            question={questionObj}
                            skills={skills}
                            levels={levels}
                            topics={topics}
                            tags={tags}
                            variant="purple"
                            placement="left"
                            isMismatched={isMismatched}
                          />
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
