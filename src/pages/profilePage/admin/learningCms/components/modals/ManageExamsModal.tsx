import { Badge, Button, Card, Col, Empty, Modal, Row, Tag } from "antd";
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
 * Manage exams assigned to a curriculum:
 * - Two-column layout: current exams in curriculum vs available published exams.
 * - Supports add, remove, reorder, and marking isRequired.
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
  const currExams      = selectedCurriculum?.exams ?? [];
  const currExamIds    = new Set(currExams.map((e) => e.examId));
  const availableExams = allExams.filter(
    (e) => e.status === "published" && !currExamIds.has(e.id)
  );

  return (
    <Modal
      title={
        <div className="text-base font-bold text-slate-800">
          Cấu hình đề thi cho giáo trình
          <div className="text-xs font-normal text-purple-600 mt-0.5">
            {selectedCurriculum?.title}
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      maskClosable={false}
      centered
      footer={[
        <Button key="done" type="primary" onClick={onDone} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold px-5">
          Hoàn tất
        </Button>,
      ]}
      width={780}
      className="rounded-3xl overflow-hidden"
    >
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
        <AlertCircle size={14} className="shrink-0 text-amber-500" />
        <span>Chỉ đề thi dạng <strong>Phát hành (published)</strong> mới có thể thêm vào giáo trình</span>
      </div>

      <Row gutter={16}>
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
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto min-h-[140px]">
              {currExams.length === 0 ? (
                <Empty description="Giáo trình chưa có đề thi nào" styles={{ image: { height: 40 } }} className="py-6" />
              ) : (
                currExams.map((ce: CurriculumExam, index) => {
                  const exam = allExams.find((e) => e.id === ce.examId);
                  return (
                    <div key={ce.examId || index} className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/60 rounded-lg transition">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold line-clamp-1 text-slate-800">
                            {exam?.title ?? "(Đề thi không tìm thấy)"}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Tag color={ce.isRequired ? "red" : "default"} className="text-[9px] border-none m-0 px-1.5 py-0">
                              {ce.isRequired ? "Bắt buộc" : "Tuỳ chọn"}
                            </Tag>
                            {exam && <span className="text-[10px] text-slate-400">{exam.questions?.length ?? 0} câu</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button type="text" size="small" disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => onReorder(index, "up")} />
                        <Button type="text" size="small" disabled={index === currExams.length - 1} icon={<ArrowDownOutlined />} onClick={() => onReorder(index, "down")} />
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveExam(ce.examId)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto min-h-[140px]">
              {availableExams.length === 0 ? (
                <Empty description="Không có đề thi đã phát hành" styles={{ image: { height: 40 } }} className="py-6" />
              ) : (
                availableExams.map((exam: Exam) => (
                  <div key={exam.id} className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/60 rounded-lg transition">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold line-clamp-1 text-slate-800">{exam.title}</div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{exam.questions?.length ?? 0} câu •</span>
                        <Clock size={10} className="inline text-slate-400" />
                        <span>
                          {exam.timeLimitSeconds
                            ? `${Math.round(exam.timeLimitSeconds / 60)} phút`
                            : "Không giới hạn"}
                        </span>
                      </span>
                    </div>
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => onAddExam(exam.id)} className="shrink-0 text-xs">
                      Thêm
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}
