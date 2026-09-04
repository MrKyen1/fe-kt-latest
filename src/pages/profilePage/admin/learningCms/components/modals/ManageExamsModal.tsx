import { Badge, Button, Card, Col, Empty, List, Modal, Row, Tag } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { AlertCircle, Clock } from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface CurriculumExam {
  examId: string;
  isRequired: boolean;
}

interface ExamQuestion { questionId: string; }

interface Exam {
  id: string;
  title: string;
  code?: string;
  status: string;
  timeLimitSeconds?: number;
  questions?: ExamQuestion[];
}

interface Curriculum {
  id: string;
  title: string;
  exams?: CurriculumExam[];
}

interface Props {
  open:              boolean;
  selectedCurriculum: Curriculum | null;
  onCancel:          () => void;
  onDone:            () => void;

  /** Full exam list (used to find exam details by ID) */
  allExams: Exam[];

  onAddExam:    (examId: string) => void;
  onRemoveExam: (examId: string) => void;
  onReorder:    (index: number, direction: "up" | "down") => void;
}

// ── Component ────────────────────────────────────────────────

/**
 * Dual-pane modal for assigning published exams to a curriculum.
 * Left pane: current curriculum exams (ordered, reorder + remove).
 * Right pane: available published exams with add button.
 */
export default function ManageExamsModal({
  open,
  selectedCurriculum,
  onCancel,
  onDone,
  allExams,
  onAddExam,
  onRemoveExam,
  onReorder,
}: Props) {
  const currExams = selectedCurriculum?.exams ?? [];
  const currExamIds = new Set(currExams.map((ce) => ce.examId));

  const availableExams = allExams.filter(
    (e) => e.status === "published" && !currExamIds.has(e.id),
  );

  return (
    <Modal
      title={
        <div>
          <div className="font-bold text-slate-800">Cấu hình đề thi cho giáo trình</div>
          <div className="text-sm text-slate-400 font-normal mt-0.5">{selectedCurriculum?.title}</div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <AlertCircle size={13} className="text-amber-500 shrink-0" />
            <span>Chỉ đề thi đang <strong>Phát hành (published)</strong> mới có thể thêm vào giáo trình</span>
          </div>
          <Button type="primary" onClick={onDone}>Hoàn tất</Button>
        </div>
      }
      className="rounded-2xl"
    >
      <Row gutter={24} className="pt-2">
        {/* Left: current exams in curriculum */}
        <Col span={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Đề thi trong giáo trình</span>
                <Badge count={currExams.length} color="purple" />
              </div>
            }
            className="rounded-2xl border-slate-100 shadow-sm"
            size="small"
          >
            <List
              dataSource={currExams}
              renderItem={(ce: CurriculumExam, index) => {
                const exam = allExams.find((e) => e.id === ce.examId);
                return (
                  <List.Item
                    actions={[
                      <Button type="text" size="small" disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => onReorder(index, "up")} />,
                      <Button type="text" size="small" disabled={index === currExams.length - 1} icon={<ArrowDownOutlined />} onClick={() => onReorder(index, "down")} />,
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveExam(ce.examId)} />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {index + 1}
                        </div>
                      }
                      title={<div className="text-xs font-semibold line-clamp-1">{exam?.title ?? "(Đề thi không tìm thấy)"}</div>}
                      description={
                        <div className="flex gap-2">
                          <Tag color={ce.isRequired ? "red" : "default"} className="text-[9px] border-none">
                            {ce.isRequired ? "Bắt buộc" : "Tuỳ chọn"}
                          </Tag>
                          {exam && <span className="text-[10px] text-slate-400">{exam.questions?.length ?? 0} câu</span>}
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
              locale={{ emptyText: <Empty description="Giáo trình chưa có đề thi nào" imageStyle={{ height: 40 }} /> }}
            />
          </Card>
        </Col>

        {/* Right: available published exams */}
        <Col span={12}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>Đề thi khả dụng (đã phát hành)</span>
                <Badge count={availableExams.length} color="green" />
              </div>
            }
            className="rounded-2xl border-slate-100 shadow-sm"
            size="small"
          >
            <List
              dataSource={availableExams}
              renderItem={(exam: Exam) => (
                <List.Item
                  actions={[
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => onAddExam(exam.id)}>
                      Thêm
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<div className="text-xs font-semibold line-clamp-1">{exam.title}</div>}
                    description={
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>{exam.questions?.length ?? 0} câu •</span>
                        <Clock size={10} className="inline text-slate-400" />
                        <span>
                          {exam.timeLimitSeconds
                            ? `${Math.round(exam.timeLimitSeconds / 60)} phút`
                            : "Không giới hạn"}
                        </span>
                      </span>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="Không có đề thi đã phát hành" imageStyle={{ height: 40 }} /> }}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
