import React, { useEffect, useState } from "react";
import { Modal, Button, Spin, Empty } from "antd";
import { EyeOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { teacherLearningService } from "../../../../services/teacherLearningService";
import { getErrorMessage } from "../../../../services/apiClient";
import { QuestionAnswerCard } from "./QuestionAnswerCard";

export function formatDuration(seconds?: number | null) {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs} giây`;
  return `${mins} phút ${secs > 0 ? `${secs}s` : ""}`;
}

export function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function TeacherAttemptDetailModal({
  assignmentId,
  attemptId,
  studentName,
  attemptSummary,
  open,
  onClose,
}: {
  assignmentId: string | null;
  attemptId: string | null;
  studentName?: string;
  attemptSummary?: any;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assignmentId || !attemptId) {
      setDetail(null);
      setErrorNotice(null);
      return;
    }
    setLoading(true);
    setErrorNotice(null);
    teacherLearningService.examAssignments
      .attemptDetail(assignmentId, attemptId)
      .then((res) => {
        setDetail(res);
      })
      .catch((err) => {
        const msg = getErrorMessage(err, "Chưa thể tải chi tiết từng câu hỏi");
        setErrorNotice(msg);
      })
      .finally(() => setLoading(false));
  }, [open, assignmentId, attemptId]);

  const activeData = detail || attemptSummary;
  const pct = activeData ? parseFloat(activeData.percentage || "0") : 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} className="rounded-xl font-medium px-5">
          Đóng
        </Button>,
      ]}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <EyeOutlined className="text-base" />
          </div>
          <div>
            <div className="font-bold text-base text-slate-800">
              Chi tiết bài làm: {studentName || "Học sinh"}
            </div>
            {activeData?.exam?.title && (
              <div className="text-xs text-slate-400 font-normal">
                Đề: <span className="text-slate-600 font-medium">{activeData.exam.title}</span>
              </div>
            )}
          </div>
        </div>
      }
      width={820}
      className="rounded-3xl overflow-hidden"
      styles={{ body: { maxHeight: "74vh", overflowY: "auto", padding: "16px 24px" } }}
    >
      {loading && !activeData ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spin size="large" />
          <span className="text-slate-400 text-sm mt-3">Đang tải chi tiết bài làm...</span>
        </div>
      ) : activeData ? (
        <div className="space-y-5 pt-1">
          {/* Refined Summary Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 items-center">
              {/* Student info */}
              <div className="col-span-2 border-r-0 sm:border-r border-slate-100 pr-2">
                <div className="text-xs font-medium text-slate-500 mb-1">Học sinh</div>
                <div className="text-base font-bold text-slate-800 truncate">
                  {activeData.student?.user?.fullName || studentName || "Học sinh"}
                </div>
                {(activeData.student?.user?.code || activeData.code) && (
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Mã: {activeData.student?.user?.code || activeData.code}
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="text-center sm:text-left">
                <div className="text-xs font-medium text-slate-500 mb-1">Điểm số</div>
                <div className="text-xl font-bold tracking-tight text-slate-800">
                  {activeData.score != null ? activeData.score : "—"}{" "}
                  <span className="text-xs text-slate-400 font-normal">/ {activeData.maxScore}</span>
                </div>
              </div>

              {/* Percentage */}
              <div className="text-center sm:text-left">
                <div className="text-xs font-medium text-slate-500 mb-1">Tỷ lệ đúng</div>
                <div
                  className={`text-xl font-bold tracking-tight ${
                    pct >= 100 ? "text-emerald-600" : "text-slate-800"
                  }`}
                >
                  {pct.toFixed(1)}%
                </div>
              </div>

              {/* Correct count & Duration */}
              <div className="text-center sm:text-left">
                <div className="text-xs font-medium text-slate-500 mb-1">Số câu đúng</div>
                <div className="text-sm font-semibold text-slate-700">
                  {activeData.displayResult || `${activeData.attemptCorrectCount ?? "—"}/${activeData.attemptQuestionCount ?? "—"}`}
                </div>
              </div>

              {/* Duration & Time */}
              <div className="text-center sm:text-left">
                <div className="text-xs font-medium text-slate-500 mb-1">Thời lượng</div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatDuration(activeData.durationSeconds)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatDateTime(activeData.submittedAt || activeData.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Question Answers List */}
          {detail?.answers && detail.answers.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Danh sách câu hỏi & câu trả lời</span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {detail.answers.length} câu
                  </span>
                </div>
              </div>

              {detail.answers.map((ans: any, idx: number) => (
                <QuestionAnswerCard key={ans.id || idx} ans={ans} idx={idx} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-start gap-3">
                <CheckCircleOutlined className="text-emerald-500 text-lg mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 text-sm">
                    Lượt làm bài đã được nộp và chấm điểm thành công
                  </div>
                  <div>
                    Kết quả ghi nhận:{" "}
                    <strong className="text-slate-800 font-bold">
                      {activeData.score} / {activeData.maxScore} điểm
                    </strong>{" "}
                    ({pct.toFixed(1)}%).
                    {activeData.displayResult && (
                      <span className="ml-1 text-slate-500">(Đúng {activeData.displayResult} câu).</span>
                    )}
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 pt-1">
                      <Spin size="small" />
                      <span className="text-slate-400">Đang tải chi tiết từng câu hỏi...</span>
                    </div>
                  )}
                  {errorNotice && (
                    <div className="text-xs text-amber-600 pt-1">{errorNotice}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Empty
            description={
              <div>
                <div className="text-slate-600 font-semibold text-sm mb-1">
                  Không thể tải chi tiết bài làm
                </div>
                {errorNotice && <div className="text-xs text-slate-400">{errorNotice}</div>}
              </div>
            }
          />
        </div>
      )}
    </Modal>
  );
}
