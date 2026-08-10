import { Badge, Button, Card, Col, Empty, Input, List, Modal, Popover, Row, Select, Tag } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { QUESTION_TYPE_COLORS, QUESTION_TYPE_LABELS, QUESTION_TYPES } from "../../constants";
import QuestionPopoverContent from "../QuestionPopoverContent";

// ── Types ────────────────────────────────────────────────────

interface TaxItem { id: string; name: string; }

interface QuestionOption {
  label?: string;
  content: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
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

  onAddQuestion:    (questionId: string) => void;
  onRemoveQuestion: (questionId: string) => void;
  onReorder:        (index: number, direction: "up" | "down") => void;
  onRepublish:      () => void;
}

// ── Filter helpers ────────────────────────────────────────────

function filterAvailableQuestions(
  allQuestions: Question[],
  examQuestions: ExamQuestion[],
  search: string,
  typeFilter:   string | undefined,
  skillFilter:  string | undefined,
  levelFilter:  string | undefined,
  topicFilter:  string | undefined,
  tagFilter:    string | undefined,
): Question[] {
  const examIds = new Set(examQuestions.map((eq) => eq.questionId));

  return allQuestions.filter((q) => {
    if (q.status !== "published") return false;
    if (examIds.has(q.id)) return false;

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const searchable = [
        q.prompt,
        q.instruction,
        q.explanation,
        ...(q.options ?? []).map((o) => o.content),
      ].filter(Boolean).join(" ").toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    if (typeFilter  && q.type                !== typeFilter)  return false;
    if (skillFilter && q.skillId             !== skillFilter)  return false;
    if (levelFilter && q.difficultyLevelId   !== levelFilter)  return false;
    if (topicFilter && q.topicId             !== topicFilter)  return false;
    if (tagFilter   && !(q.tagIds ?? []).includes(tagFilter)) return false;

    return true;
  });
}

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
}: Props) {
  const examQuestions = selectedExam?.questions ?? [];

  const hasActiveFilters = !!(
    examQSearch || examQTypeFilter || examQSkillFilter ||
    examQLevelFilter || examQTopicFilter || examQTagFilter
  );

  const available = filterAvailableQuestions(
    allQuestions,
    examQuestions,
    examQSearch,
    examQTypeFilter,
    examQSkillFilter,
    examQLevelFilter,
    examQTopicFilter,
    examQTagFilter,
  );

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
      width={1000}
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-400">
            ⚠️ Chỉ câu hỏi đã được <strong>Duyệt (published)</strong> mới có thể thêm vào đề thi
          </div>
          <Button type="primary" onClick={onDone}>Hoàn tất</Button>
        </div>
      }
      className="rounded-2xl"
    >
      {/* Published-exam warning banner */}
      {selectedExam?.status === "published" && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex justify-between items-center gap-3">
          <div className="leading-relaxed">
            ⚠️ <strong>Lưu ý:</strong> Đề thi này đang ở trạng thái <strong>Đang phát hành</strong>.
            Các thay đổi về câu hỏi sẽ không tự động áp dụng cho học sinh đã giao cho đến khi bạn{" "}
            <strong>Xuất bản phiên bản mới</strong>.
          </div>
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
        </div>
      )}

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
                const detail = questionDetails[q?.id ?? ""] ?? q;
                return (
                  <List.Item
                    actions={[
                      <Button type="text" size="small" disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => onReorder(index, "up")} />,
                      <Button type="text" size="small" disabled={index === examQuestions.length - 1} icon={<ArrowDownOutlined />} onClick={() => onReorder(index, "down")} />,
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveQuestion(eq.questionId)} />,
                    ]}
                  >
                    <Popover
                      content={<QuestionPopoverContent question={detail} skills={skills} levels={levels} topics={topics} tags={tags} />}
                      title={<div className="font-bold text-slate-800 text-xs">Chi tiết câu hỏi</div>}
                      trigger="hover"
                      placement="right"
                      mouseEnterDelay={0.15}
                      overlayStyle={{ maxWidth: 380 }}
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
                    </Popover>
                  </List.Item>
                );
              }}
              locale={{ emptyText: <Empty description="Đề thi chưa có câu hỏi nào" imageStyle={{ height: 40 }} /> }}
            />
          </Card>
        </Col>

        {/* Right: available questions */}
        <Col span={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Ngân hàng câu hỏi (đã duyệt)</span>
                <Badge count={available.length} color="green" />
              </div>
            }
            className="rounded-2xl border-slate-100 shadow-sm"
            size="small"
            styles={{ body: { paddingTop: 8 } }}
          >
            {/* Filter panel */}
            <div className="mb-3 rounded-xl border border-indigo-100 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
              <div className="px-3 pt-3 pb-2">
                <Input
                  placeholder="🔍  Tìm theo đề bài, đáp án, giải thích..."
                  value={examQSearch}
                  onChange={(e) => onExamQSearch(e.target.value)}
                  allowClear
                  size="small"
                  style={{ borderRadius: 8, border: "1px solid #e0e7ff", background: "#fff", fontSize: 12 }}
                />
              </div>

              <div className="mx-3 border-t border-slate-100" />

              <div className="px-3 py-2 grid grid-cols-2 gap-1.5">
                <Select placeholder="📋 Loại câu hỏi" value={examQTypeFilter} onChange={onExamQTypeFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false}>
                  {QUESTION_TYPES.map((qt) => <Select.Option key={qt.value} value={qt.value}>{qt.label}</Select.Option>)}
                </Select>
                <Select placeholder="💡 Kỹ năng" value={examQSkillFilter} onChange={onExamQSkillFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false}>
                  {skills.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                </Select>
                <Select placeholder="🎯 Cấp độ" value={examQLevelFilter} onChange={onExamQLevelFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false}>
                  {levels.map((l) => <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>)}
                </Select>
                <Select placeholder="📁 Chủ đề" value={examQTopicFilter} onChange={onExamQTopicFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} popupMatchSelectWidth={false}>
                  {topics.map((t) => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                </Select>
                <Select placeholder="🏷 Thẻ gắn (Tag)" value={examQTagFilter} onChange={onExamQTagFilter} allowClear size="small" style={{ width: "100%", fontSize: 11 }} className="col-span-2" popupMatchSelectWidth={false}>
                  {tags.map((t) => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="mx-3 mb-2 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                  <span className="text-[11px] text-indigo-600">
                    🔎 Tìm thấy <strong>{available.length}</strong> câu hỏi
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
              style={{ maxHeight: 340, overflowY: "auto" }}
              dataSource={available}
              renderItem={(q: Question) => (
                <List.Item
                  actions={[
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => onAddQuestion(q.id)}>
                      Thêm
                    </Button>,
                  ]}
                >
                  <Popover
                    content={<QuestionPopoverContent question={questionDetails[q.id] ?? q} skills={skills} levels={levels} topics={topics} tags={tags} />}
                    title={<div className="font-bold text-slate-800 text-xs">Chi tiết câu hỏi</div>}
                    trigger="hover"
                    placement="left"
                    mouseEnterDelay={0.15}
                    overlayStyle={{ maxWidth: 380 }}
                  >
                    <div className="cursor-pointer flex-1 pr-2 min-w-0">
                      <List.Item.Meta
                        title={
                          <div className="text-xs font-semibold line-clamp-1 text-slate-800" dangerouslySetInnerHTML={{ __html: q.prompt ?? "" }} />
                        }
                        description={
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Tag color={QUESTION_TYPE_COLORS[q.type]} className="text-[9px] border-none m-0">
                              {QUESTION_TYPE_LABELS[q.type]}
                            </Tag>
                            {q.difficultyLevelId && (
                              <span className="text-[10px] text-slate-400">• {levels.find((l) => l.id === q.difficultyLevelId)?.name}</span>
                            )}
                            {q.skillId && (
                              <span className="text-[10px] text-slate-400">• {skills.find((s) => s.id === q.skillId)?.name}</span>
                            )}
                          </div>
                        }
                      />
                    </div>
                  </Popover>
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="Không tìm thấy câu hỏi đã duyệt phù hợp" imageStyle={{ height: 40 }} /> }}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
