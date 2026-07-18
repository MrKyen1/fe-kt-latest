import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
  Statistic,
  Tooltip,
  Progress,
  Alert,
} from "antd";

import {
  BookOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
  InfinityOutlined,
} from "@ant-design/icons";

import { teacherLearningService, ClassCurriculum } from "../../../services/teacherLearningService";
import { learningCmsService } from "../../../services/learningCmsService";
import { academicService } from "../../../services/academicService";
import { userService } from "../../../services/userService";
import { useAuth } from "../../../contexts/AuthContext";

const { Title, Text } = Typography;

// ==================== TYPES ====================
type AssignmentStatus = "active" | "cancelled";

interface ExamOption { id: string; title?: string; code?: string; status?: string; }
interface CurriculumOption { id: string; title?: string; code?: string; status?: string; }
interface ClassOption { id: string; name?: string; centerId?: string; }
interface StudentOption {
  id: string;
  fullName?: string;
  code?: string;
  studentProfile?: { id?: string; classes?: { id: string }[] };
}

// ==================== STATUS TAG ====================
const statusTag = (status: AssignmentStatus) => {
  if (status === "active")
    return <Tag color="success" className="rounded-full border-none text-xs font-semibold px-3">✓ Đang hoạt động</Tag>;
  return <Tag color="default" className="rounded-full border-none text-xs font-semibold px-3">Đã huỷ</Tag>;
};

const maxAttemptsTag = (n?: number | null) => {
  if (!n) return <Tag color="blue" className="rounded-full border-none text-xs">♾ Vĩnh viễn</Tag>;
  return <Tag color="orange" className="rounded-full border-none text-xs">{n} lần</Tag>;
};

// ==================== EXAM ANALYTICS MODAL ====================
function ExamAnalyticsModal({
  assignmentId, open, onClose,
}: { assignmentId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) return;
    setLoading(true);
    teacherLearningService.examAssignments
      .analytics(assignmentId)
      .then(setData)
      .catch(() => message.error("Không thể tải analytics"))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={<div className="flex items-center gap-2 text-indigo-700"><BarChartOutlined /><span className="font-bold">Thống kê bài thi được giao</span></div>}
      width={680}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spin size="large" /></div>
      ) : data ? (
        <div className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card className="rounded-2xl border-slate-100 bg-indigo-50 text-center">
                <Statistic title="Học sinh được giao" value={data.assignedCount ?? 0}
                  prefix={<TeamOutlined className="text-indigo-500" />}
                  valueStyle={{ color: "#4f46e5" }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="rounded-2xl border-slate-100 bg-emerald-50 text-center">
                <Statistic title="Đã nộp bài" value={data.submittedCount ?? 0}
                  prefix={<CheckCircleOutlined className="text-emerald-500" />}
                  valueStyle={{ color: "#10b981" }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="rounded-2xl border-slate-100 bg-amber-50 text-center">
                <Statistic title="Tổng lượt làm" value={data.attemptsCount ?? 0}
                  prefix={<ClockCircleOutlined className="text-amber-500" />}
                  valueStyle={{ color: "#f59e0b" }} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card className="rounded-2xl border-slate-100">
                <div className="text-slate-500 text-sm mb-1">Điểm trung bình</div>
                <div className="text-2xl font-bold text-slate-800">{data.averageScore?.toFixed(2) ?? "—"}</div>
                <div className="text-xs text-slate-400 mt-1">({data.averagePercentage?.toFixed(1) ?? "—"}%)</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card className="rounded-2xl border-slate-100">
                <div className="text-slate-500 text-sm mb-1">Điểm cao nhất</div>
                <div className="text-2xl font-bold text-emerald-600">{data.bestScore?.toFixed(2) ?? "—"}</div>
                <div className="text-xs text-slate-400 mt-1">({data.bestPercentage?.toFixed(1) ?? "—"}%)</div>
              </Card>
            </Col>
          </Row>
          {data.perQuestion?.length > 0 && (
            <Card className="rounded-2xl border-slate-100">
              <div className="text-slate-600 font-semibold mb-3">Thống kê theo câu hỏi</div>
              <Table size="small" pagination={false} rowKey="questionId" dataSource={data.perQuestion}
                columns={[
                  { title: "Câu hỏi", dataIndex: "questionId", render: (id: string) => <span className="font-mono text-xs text-slate-400">{id.slice(0, 8)}…</span> },
                  { title: "Đúng / Tổng", render: (_: any, r: any) => <span className="font-semibold text-slate-700">{r.correct} / {r.total}</span> },
                  { title: "Tỷ lệ đúng", dataIndex: "correctnessRate", render: (rate: number) => <Progress percent={Math.round(rate)} size="small" strokeColor={rate >= 70 ? "#10b981" : rate >= 40 ? "#f59e0b" : "#ef4444"} /> },
                ]}
              />
            </Card>
          )}
        </div>
      ) : <Empty description="Chưa có dữ liệu thống kê" />}
    </Modal>
  );
}

// ==================== CURRICULUM ANALYTICS MODAL ====================
function CurriculumAnalyticsModal({
  assignmentId, open, onClose,
}: { assignmentId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) return;
    setLoading(true);
    teacherLearningService.curriculumAssignments
      .analytics(assignmentId)
      .then(setData)
      .catch(() => message.error("Không thể tải analytics"))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={<div className="flex items-center gap-2 text-purple-700"><BarChartOutlined /><span className="font-bold">Thống kê giáo trình học được giao</span></div>}
      width={520}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spin size="large" /></div>
      ) : data ? (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col span={12}><Card className="rounded-2xl border-slate-100 bg-purple-50 text-center">
              <Statistic title="Học sinh được giao" value={data.assignedCount ?? 0}
                prefix={<TeamOutlined className="text-purple-500" />} valueStyle={{ color: "#7c3aed" }} />
            </Card></Col>
            <Col span={12}><Card className="rounded-2xl border-slate-100 bg-emerald-50 text-center">
              <Statistic title="Đã hoàn thành" value={data.completedCount ?? 0}
                prefix={<CheckCircleOutlined className="text-emerald-500" />} valueStyle={{ color: "#10b981" }} />
            </Card></Col>
            <Col span={12}><Card className="rounded-2xl border-slate-100 bg-amber-50 text-center">
              <Statistic title="Đang học" value={data.inProgressCount ?? 0}
                prefix={<ClockCircleOutlined className="text-amber-500" />} valueStyle={{ color: "#f59e0b" }} />
            </Card></Col>
            <Col span={12}><Card className="rounded-2xl border-slate-100 bg-slate-50 text-center">
              <Statistic title="Tiến độ TB" value={`${data.averageProgress?.toFixed(1) ?? "0"}%`}
                prefix={<BarChartOutlined className="text-slate-500" />} valueStyle={{ color: "#475569" }} />
            </Card></Col>
          </Row>
          <Progress percent={Math.round(data.averageProgress ?? 0)}
            strokeColor={{ "0%": "#7c3aed", "100%": "#10b981" }}
            format={(p) => `Tiến độ TB: ${p}%`} />
        </div>
      ) : <Empty description="Chưa có dữ liệu thống kê" />}
    </Modal>
  );
}

// ==================== MAIN COMPONENT ====================
export default function TeacherAssignments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("class-curriculum");

  // ---- Data ----
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  const [classCurriculums, setClassCurriculums] = useState<ClassCurriculum[]>([]);
  const [examAssignments, setExamAssignments] = useState<any[]>([]);
  const [curriculumAssignments, setCurriculumAssignments] = useState<any[]>([]);

  // ---- Loading ----
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- Modals ----
  const [classCurriculumFormOpen, setClassCurriculumFormOpen] = useState(false);
  const [examFormOpen, setExamFormOpen] = useState(false);
  const [curriculumFormOpen, setCurriculumFormOpen] = useState(false);
  const [examAnalyticsId, setExamAnalyticsId] = useState<string | null>(null);
  const [curriculumAnalyticsId, setCurriculumAnalyticsId] = useState<string | null>(null);

  // ---- Forms ----
  const [classCurriculumForm] = Form.useForm();
  const [examForm] = Form.useForm();
  const [curriculumForm] = Form.useForm();

  // ---- Selected class (for filtering students) ----
  const [selectedClassForExam, setSelectedClassForExam] = useState<string | undefined>(undefined);
  const [selectedClassForCurriculum, setSelectedClassForCurriculum] = useState<string | undefined>(undefined);

  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [examVersionsMap, setExamVersionsMap] = useState<Record<string, any[]>>({});

  const handleExamSelectionChange = async (ids: string[]) => {
    setSelectedExamIds(ids);
    const newVersionsMap = { ...examVersionsMap };
    for (const id of ids) {
      if (!newVersionsMap[id]) {
        try {
          const versions = await learningCmsService.exams.listVersions(id);
          newVersionsMap[id] = versions || [];
        } catch (err) {
          console.error("Failed to fetch versions for exam " + id, err);
        }
      }
    }
    setExamVersionsMap(newVersionsMap);
  };

  // ==================== LOAD DATA ====================
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        learningCmsService.exams.list({ status: "published", limit: 100 }),
        learningCmsService.curriculums.list({ status: "published", limit: 100 }),
        academicService.classes.list({ limit: 100, isActive: true }),
        userService.list({ roleCode: "student" }),
        teacherLearningService.classCurriculums.list({ limit: 100 }),
        teacherLearningService.examAssignments.list({ limit: 100 }),
        teacherLearningService.curriculumAssignments.list({ limit: 100 }),
      ]);

      const get = (i: number, name: string) => {
        const res = results[i];
        if (res.status === "rejected") {
          if (name === "classes") {
            return user?.teacherProfile?.classes ?? [];
          }
          if (name === "students") {
            return [];
          }
          return { data: [] };
        }
        const apiData = res.value;
        if (name === "classes" && user?.role === "teacher") {
          const teacherClassIds = (user.teacherProfile?.classes?.map((c: any) => c.id || c.classId) ?? []).filter(Boolean);
          const teacherCenters = new Set([
            ...(user.teacherProfile?.classes?.map((c: any) => c.centerId || c.center?.id).filter(Boolean) ?? []),
            ...(apiData as any[])
              .filter((c: any) => teacherClassIds.includes(c.id))
              .map((c: any) => c.centerId)
              .filter(Boolean)
          ]);
          if (teacherCenters.size > 0) {
            return (apiData as any[]).filter((c: any) => teacherCenters.has(c.centerId));
          }
          return (apiData as any[]).filter((c: any) => teacherClassIds.includes(c.id));
        }
        return apiData;
      };

      setExams(get(0, "exams")?.data ?? []);
      setCurriculums(get(1, "curriculums")?.data ?? []);
      setClasses(get(2, "classes") ?? []);
      setAllStudents(get(3, "students") ?? []);
      setClassCurriculums(get(4, "classCurriculums")?.data ?? []);
      const rawExams = get(5, "examAssignments")?.data ?? [];
      setExamAssignments(rawExams);

      // Asynchronously fetch assignment details to load recipient student profiles & exams
      Promise.all(
        rawExams.map((item: any) =>
          teacherLearningService.examAssignments.get(item.id)
            .catch(() => item)
        )
      ).then((detailed) => {
        setExamAssignments(detailed);
      });

      setCurriculumAssignments(get(6, "curriculumAssignments")?.data ?? []);
    } catch {
      message.error("Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };


  /**
   * Lọc học sinh theo lớp.
   * studentProfile.classes có shape: Array<{ classId, isActive, class?: {id, name} }>
   * sau khi đi qua mapUserResponse thì đã được map thành classes: ClassRoom[]
   * và classIds: string[].
   */
  const getStudentsForClass = (classId?: string) => {
    let list = allStudents;
    if (user?.role === "teacher") {
      const teacherClassIds = (user.teacherProfile?.classes?.map((c: any) => c.id || c.classId) ?? []).filter(Boolean);
      const teacherCenters = new Set([
        ...(user.teacherProfile?.classes?.map((c: any) => c.centerId || c.center?.id).filter(Boolean) ?? []),
        ...classes.filter((c: any) => teacherClassIds.includes(c.id)).map((c: any) => c.centerId).filter(Boolean)
      ]);

      if (teacherCenters.size > 0) {
        list = allStudents.filter((s) => {
          const studentClasses = s.studentProfile?.classes ?? [];
          const studentClassIds = s.studentProfile?.classIds ?? [];
          return studentClasses.some((sc: any) => {
            const matchedClass = classes.find((c) => c.id === (sc.id || sc.classId));
            return matchedClass && teacherCenters.has(matchedClass.centerId);
          }) || studentClassIds.some((cid) => {
            const matchedClass = classes.find((c) => c.id === cid);
            return matchedClass && teacherCenters.has(matchedClass.centerId);
          });
        });
      } else {
        list = allStudents.filter((s) => {
          const classIds = s.studentProfile?.classIds ?? [];
          const classesArr = s.studentProfile?.classes ?? [];
          return classIds.some((id: string) => teacherClassIds.includes(id)) ||
                 classesArr.some((c: any) => teacherClassIds.includes(c.id) || teacherClassIds.includes(c.classId));
        });
      }
    }

    if (!classId) return list;
    return list.filter((s) => {
      const classIds = s.studentProfile?.classIds ?? [];
      if (classIds.includes(classId)) return true;
      const classesArr = s.studentProfile?.classes ?? [];
      return classesArr.some((c: any) => c.id === classId || c.classId === classId);
    });
  };

  // ==================== CLASS-CURRICULUM HANDLERS ====================
  const handleCreateClassCurriculum = async (values: any) => {
    try {
      setSubmitting(true);
      const curriculumIds = Array.isArray(values.curriculumIds)
        ? values.curriculumIds
        : [values.curriculumIds].filter(Boolean);

      if (curriculumIds.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một giáo trình!");
      }

      const results = await Promise.allSettled(
        curriculumIds.map((cId) =>
          teacherLearningService.classCurriculums.create({
            classId: values.classId,
            curriculumId: cId,
            maxAttempts: values.maxAttempts || undefined,
          })
        )
      );

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        message.success("Đã gắn giáo trình vào lớp thành công!");
      } else if (failed.length < curriculumIds.length) {
        const errorMessages = failed
          .map((f: any) => f.reason?.response?.data?.message || f.reason?.message || "Lỗi")
          .join(", ");
        message.warning(`Gắn thành công một số giáo trình. Lỗi: ${errorMessages}`);
      } else {
        const errorMessages = failed
          .map((f: any) => f.reason?.response?.data?.message || f.reason?.message || "Lỗi")
          .join(", ");
        throw new Error(errorMessages);
      }

      classCurriculumForm.resetFields();
      setClassCurriculumFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = err?.message || "Gắn giáo trình vào lớp thất bại";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveClassCurriculum = (id: string) => {
    Modal.confirm({
      title: "Gỡ giáo trình khỏi lớp",
      content: "Học sinh trong lớp sẽ không còn thấy giáo trình này (trừ khi đã được giao trực tiếp).",
      okText: "Gỡ",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await teacherLearningService.classCurriculums.remove(id);
          message.success("Đã gỡ giáo trình khỏi lớp");
          loadAll();
        } catch {
          message.error("Gỡ thất bại");
        }
      },
    });
  };

  // ==================== EXAM ASSIGNMENT HANDLERS ====================
  const handleCreateExamAssignment = async (values: any) => {
    const examIds: string[] = Array.isArray(values.examIds) ? values.examIds : [values.examIds];
    if (!examIds.length) { message.warning("Vui lòng chọn ít nhất 1 bài thi!"); return; }
    if (!values.classId && (!values.studentIds || !values.studentIds.length)) {
      message.warning("Vui lòng chọn lớp học hoặc ít nhất 1 học sinh!");
      return;
    }
    try {
      setSubmitting(true);
      const examVersions = values.examVersions || {};
      const examsPayload = examIds.map((examId) => ({
        examId,
        examVersionId: examVersions[examId] || undefined,
      }));
      await teacherLearningService.examAssignments.create({
        exams: examsPayload,
        classId: values.classId || undefined,
        studentIds: values.studentIds?.length ? values.studentIds : undefined,
        maxAttempts: values.maxAttempts || undefined,
        title: values.title || undefined,
        instructions: values.instructions || undefined,
      });
      message.success(`Giao ${examIds.length > 1 ? `${examIds.length} bài thi` : "bài thi"} thành công!`);
      examForm.resetFields();
      setSelectedExamIds([]);
      setExamVersionsMap({});
      setSelectedClassForExam(undefined);
      setExamFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Giao bài thi thất bại";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExamAssignment = (id: string) => {
    Modal.confirm({
      title: "Huỷ giao bài thi",
      content: "Học sinh sẽ không thể làm bài mới từ assignment này.",
      okText: "Huỷ assignment",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await teacherLearningService.examAssignments.cancel(id);
          message.success("Đã huỷ assignment");
          loadAll();
        } catch { message.error("Huỷ thất bại"); }
      },
    });
  };

  // ==================== CURRICULUM ASSIGNMENT HANDLERS ====================
  const handleCreateCurriculumAssignment = async (values: any) => {
    if (!values.studentIds || !values.studentIds.length) {
      message.warning("Vui lòng chọn ít nhất 1 học sinh!"); return;
    }
    try {
      setSubmitting(true);
      await teacherLearningService.curriculumAssignments.create({
        curriculumId: values.curriculumId,
        studentIds: values.studentIds,
        classId: values.classId || undefined,
        maxAttempts: values.maxAttempts || undefined,
        title: values.title || undefined,
        instructions: values.instructions || undefined,
      });
      message.success("Giao giáo trình cho học sinh thành công!");
      curriculumForm.resetFields();
      setSelectedClassForCurriculum(undefined);
      setCurriculumFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Giao giáo trình thất bại";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCurriculumAssignment = (id: string) => {
    Modal.confirm({
      title: "Huỷ giao giáo trình học",
      content: "Học sinh sẽ không còn truy cập giáo trình này.",
      okText: "Huỷ assignment",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await teacherLearningService.curriculumAssignments.cancel(id);
          message.success("Đã huỷ assignment");
          loadAll();
        } catch { message.error("Huỷ thất bại"); }
      },
    });
  };

  // ==================== TABLE COLUMNS ====================
  const classCurriculumColumns = [
    {
      title: "Giáo trình",
      render: (_: any, r: ClassCurriculum) => (
        <div>
          <div className="font-semibold text-slate-800">{r.curriculum?.title || r.curriculumId}</div>
          {r.curriculum?.code && <div className="text-xs text-slate-400 font-mono">{r.curriculum.code}</div>}
        </div>
      ),
    },
    {
      title: "Lớp học",
      render: (_: any, r: ClassCurriculum) => (
        <Tag color="cyan" className="rounded-full">{r.class?.name || r.classId}</Tag>
      ),
    },
    {
      title: "Số lần làm",
      render: (_: any, r: ClassCurriculum) => maxAttemptsTag(r.maxAttempts),
    },
    {
      title: "Ngày tạo",
      render: (_: any, r: ClassCurriculum) => r.createdAt
        ? <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
        : "—",
    },
    {
      title: "Thao tác", align: "right" as const,
      render: (_: any, r: ClassCurriculum) => (
        <Tooltip title="Gỡ giáo trình khỏi lớp">
          <Button type="text" size="small" danger
            icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
            onClick={() => handleRemoveClassCurriculum(r.id)}
          />
        </Tooltip>
      ),
    },
  ];

  const examAssignmentColumns = [
    {
      title: "Bài thi",
      render: (_: any, record: any) => {
        const examItems = record.exams || [];
        const titleStr = record.title;
        return (
          <div>
            {titleStr && <div className="font-semibold text-slate-800 mb-1">{titleStr}</div>}
            <div className="text-slate-600 text-sm space-y-1">
              {examItems.map((item: any, idx: number) => (
                <div key={item.examId || idx} className={titleStr ? "pl-2 border-l-2 border-slate-200" : ""}>
                  <div className={titleStr ? "text-xs font-normal" : "font-semibold text-slate-800"}>
                    {item.exam?.title || item.exam?.code || item.examId}
                  </div>
                  {item.exam?.code && <div className="text-[10px] text-slate-400 font-mono">{item.exam.code}</div>}
                </div>
              ))}
              {examItems.length === 0 && !titleStr && <span className="text-slate-400">—</span>}
            </div>
          </div>
        );
      }
    },
    {
      title: "Lớp học",
      render: (_: any, record: any) => record.class?.name
        ? <Tag color="blue" className="rounded-full">{record.class.name}</Tag>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      title: "Đối tượng",
      render: (_: any, record: any) => {
        const students = record.students || [];
        const cnt = record.studentIds?.length ?? students.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs">
              {students.map((s: any, idx: number) => {
                const name = s.student?.user?.fullName || s.studentId;
                const statusText = s.status === "finished" ? "Đã hoàn thành" : s.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu";
                return <div key={s.id || idx}>{name}: <span className="font-semibold">{statusText}</span></div>;
              })}
            </div>
          );
          const content = (
            <span className="text-sm text-slate-600">
              <UserOutlined className="mr-1 text-indigo-400" />
              {cnt} học sinh
            </span>
          );
          return <Tooltip title={tooltipContent}>{content}</Tooltip>;
        }
        return <span className="text-sm text-slate-600"><TeamOutlined className="mr-1 text-emerald-400" />Toàn bộ lớp</span>;
      },
    },
    {
      title: "Số lần làm",
      render: (_: any, record: any) => maxAttemptsTag(record.maxAttempts),
    },
    { title: "Trạng thái", render: (_: any, record: any) => statusTag(record.status) },
    {
      title: "Ngày tạo",
      render: (_: any, record: any) => {
        const d = record.createdAt || record.created_at;
        return d ? <span className="text-xs text-slate-400">{new Date(d).toLocaleDateString("vi-VN")}</span> : "—";
      },
    },
    {
      title: "Thao tác", align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Xem thống kê">
            <Button type="text" size="small"
              icon={<BarChartOutlined className="text-slate-400 hover:text-indigo-600" />}
              onClick={() => setExamAnalyticsId(record.id)}
            />
          </Tooltip>
          {record.status === "active" && (
            <Tooltip title="Huỷ assignment">
              <Button type="text" size="small" danger
                icon={<CloseCircleOutlined className="text-slate-400 hover:text-rose-600" />}
                onClick={() => handleCancelExamAssignment(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const curriculumAssignmentColumns = [
    {
      title: "Giáo trình học",
      render: (_: any, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">
            {record.title || record.curriculum?.title || record.curriculum?.code || "—"}
          </div>
          {record.curriculum?.code && <div className="text-xs text-slate-400 font-mono">{record.curriculum.code}</div>}
        </div>
      ),
    },
    {
      title: "Lớp học",
      render: (_: any, record: any) => record.class?.name
        ? <Tag color="purple" className="rounded-full">{record.class.name}</Tag>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      title: "Học sinh",
      render: (_: any, record: any) => {
        const students = record.students || [];
        const cnt = record.studentIds?.length ?? students.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs">
              {students.map((s: any, idx: number) => {
                const name = s.student?.user?.fullName || s.studentId;
                const statusText = s.status === "finished" ? "Đã hoàn thành" : s.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu";
                return <div key={s.id || idx}>{name}: <span className="font-semibold">{statusText}</span></div>;
              })}
            </div>
          );
          const content = (
            <span className="text-sm text-slate-600">
              <UserOutlined className="mr-1 text-purple-400" />
              {cnt} học sinh
            </span>
          );
          return <Tooltip title={tooltipContent}>{content}</Tooltip>;
        }
        return <span className="text-sm text-slate-400">—</span>;
      },
    },
    {
      title: "Số lần làm",
      render: (_: any, record: any) => maxAttemptsTag(record.maxAttempts),
    },
    { title: "Trạng thái", render: (_: any, record: any) => statusTag(record.status) },
    {
      title: "Ngày tạo",
      render: (_: any, record: any) => {
        const d = record.createdAt || record.created_at;
        return d ? <span className="text-xs text-slate-400">{new Date(d).toLocaleDateString("vi-VN")}</span> : "—";
      },
    },
    {
      title: "Thao tác", align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Xem thống kê">
            <Button type="text" size="small"
              icon={<BarChartOutlined className="text-slate-400 hover:text-purple-600" />}
              onClick={() => setCurriculumAnalyticsId(record.id)}
            />
          </Tooltip>
          {record.status === "active" && (
            <Tooltip title="Huỷ assignment">
              <Button type="text" size="small" danger
                icon={<CloseCircleOutlined className="text-slate-400 hover:text-rose-600" />}
                onClick={() => handleCancelCurriculumAssignment(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================
  return (
    <ConfigProvider
      theme={{
        token: { borderRadius: 12, colorPrimary: "#4f46e5", fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
        components: { Table: { headerBg: "#f8fafc", headerColor: "#475569", rowHoverBg: "#f1f5f9" } },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight">
                  📋 Quản lý Giao bài
                </Title>
                <Text className="text-slate-500 text-sm">
                  Gắn giáo trình vào lớp, giao bài thi hoặc giáo trình cho học sinh cụ thể
                </Text>
              </div>
              <Button icon={<ReloadOutlined />} onClick={loadAll}
                className="rounded-xl border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                Làm mới
              </Button>
            </div>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="large"
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              tabBarStyle={{ padding: "16px 16px 0", background: "white", marginBottom: 0 }}
              items={[
                // ======= TAB 1: CLASS-CURRICULUM =======
                {
                  key: "class-curriculum",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <LinkOutlined />
                      <span>Giáo Trình → Lớp</span>
                    </span>
                  ),
                  children: (
                    <div className="p-6">
                      <Alert
                        type="info"
                        showIcon
                        className="mb-4 rounded-xl"
                        message="Gắn giáo trình vào lớp học"
                        description="Khi gắn một giáo trình vào lớp, toàn bộ học sinh trong lớp sẽ tự động thấy và có thể tự vào làm tất cả bài thi trong giáo trình đó."
                      />
                      <div className="flex justify-end mb-4">
                        <Button type="primary" icon={<PlusOutlined />}
                          onClick={() => { classCurriculumForm.resetFields(); setClassCurriculumFormOpen(true); }}
                          className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-cyan-500/20"
                          style={{ background: "#0891b2", borderColor: "#0891b2" }}
                        >
                          Gắn Giáo Trình vào Lớp
                        </Button>
                      </div>
                      {classCurriculums.length === 0 ? (
                        <div className="py-16 text-center">
                          <Empty description={<span className="text-slate-400">Chưa có giáo trình nào được gắn vào lớp.<br />Nhấn "Gắn Giáo Trình vào Lớp" để bắt đầu.</span>} />
                        </div>
                      ) : (
                        <Table dataSource={classCurriculums} columns={classCurriculumColumns} rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                          className="rounded-2xl overflow-hidden" />
                      )}
                    </div>
                  ),
                },

                // ======= TAB 2: EXAM ASSIGNMENT =======
                {
                  key: "exam",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <FileTextOutlined />
                      <span>Giao Bài Thi</span>
                    </span>
                  ),
                  children: (
                    <div className="p-6">
                      <Alert
                        type="info"
                        showIcon
                        className="mb-4 rounded-xl"
                        message="Giao bài thi cho học sinh"
                        description="Có thể chọn nhiều bài thi cùng lúc. Giao cho toàn bộ lớp (chỉ chọn lớp) hoặc học sinh cụ thể. Bài thi bất kỳ đều được, không cần thuộc giáo trình của lớp."
                      />
                      <div className="flex justify-end mb-4">
                        <Button type="primary" icon={<PlusOutlined />}
                          onClick={() => { examForm.resetFields(); setSelectedClassForExam(undefined); setExamFormOpen(true); }}
                          className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-indigo-500/20"
                        >
                          Giao Bài Thi Mới
                        </Button>
                      </div>
                      {examAssignments.length === 0 ? (
                        <div className="py-16 text-center">
                          <Empty description={<span className="text-slate-400">Chưa có bài thi nào được giao.<br />Nhấn "Giao Bài Thi Mới" để bắt đầu.</span>} />
                        </div>
                      ) : (
                        <Table dataSource={examAssignments} columns={examAssignmentColumns} rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                          className="rounded-2xl overflow-hidden" />
                      )}
                    </div>
                  ),
                },

                // ======= TAB 3: CURRICULUM ASSIGNMENT (DIRECT) =======
                {
                  key: "curriculum",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <BookOutlined />
                      <span>Giao Giáo Trình (Trực tiếp)</span>
                    </span>
                  ),
                  children: (
                    <div className="p-6">
                      <Alert
                        type="warning"
                        showIcon
                        className="mb-4 rounded-xl"
                        message="Giao giáo trình trực tiếp cho học sinh"
                        description="Khác với 'Gắn Giáo Trình vào Lớp', tính năng này giao giáo trình trực tiếp cho học sinh cụ thể (bất kể lớp). Học sinh được giao sẽ thấy giáo trình dù không thuộc lớp đó."
                      />
                      <div className="flex justify-end mb-4">
                        <Button type="primary" icon={<PlusOutlined />}
                          onClick={() => { curriculumForm.resetFields(); setSelectedClassForCurriculum(undefined); setCurriculumFormOpen(true); }}
                          className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-purple-500/20"
                          style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
                        >
                          Giao Giáo Trình Trực Tiếp
                        </Button>
                      </div>
                      {curriculumAssignments.length === 0 ? (
                        <div className="py-16 text-center">
                          <Empty description={<span className="text-slate-400">Chưa có giáo trình nào được giao trực tiếp.<br />Nhấn "Giao Giáo Trình Trực Tiếp" để bắt đầu.</span>} />
                        </div>
                      ) : (
                        <Table dataSource={curriculumAssignments} columns={curriculumAssignmentColumns} rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                          className="rounded-2xl overflow-hidden" />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Spin>
      </div>

      {/* ==================== CLASS-CURRICULUM FORM MODAL ==================== */}
      <Modal open={classCurriculumFormOpen} onCancel={() => setClassCurriculumFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-cyan-700 font-bold text-lg"><LinkOutlined />Gắn Giáo Trình vào Lớp</div>}
        width={520}
      >
        <Form form={classCurriculumForm} layout="vertical" onFinish={handleCreateClassCurriculum} className="pt-2">
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: "Vui lòng chọn lớp!" }]}>
            <Select showSearch placeholder="Chọn lớp học..." optionFilterProp="children" className="rounded-xl">
              {classes.map((c) => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="curriculumIds" label="Giáo trình" rules={[{ required: true, message: "Vui lòng chọn giáo trình!" }]}>
            <Select mode="multiple" showSearch placeholder="Chọn giáo trình..." optionFilterProp="children" className="rounded-xl">
              {curriculums.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.title || c.code} <span className="text-slate-400 text-xs ml-1">({c.code})</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="maxAttempts" label={<span>Số lần làm tối đa <span className="text-slate-400 font-normal text-xs">(bỏ trống = vĩnh viễn)</span></span>}>
            <InputNumber min={1} placeholder="Ví dụ: 3" className="rounded-xl w-full" />
          </Form.Item>
          <Divider className="my-4" />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setClassCurriculumFormOpen(false)} className="rounded-xl">Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              className="rounded-xl px-6 font-semibold shadow-md"
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
            >
              Gắn giáo trình
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== EXAM ASSIGNMENT FORM MODAL ==================== */}
      <Modal open={examFormOpen} onCancel={() => setExamFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-indigo-700 font-bold text-lg"><FileTextOutlined />Giao Bài Thi Mới</div>}
        width={600}
      >
        <Form form={examForm} layout="vertical" onFinish={handleCreateExamAssignment} className="pt-2">
          <Form.Item
            name="examIds"
            label={<span>Bài thi <span className="text-slate-400 font-normal text-xs">(có thể chọn nhiều)</span></span>}
            rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 bài thi!" }]}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder="Chọn bài thi..."
              optionFilterProp="children"
              className="rounded-xl"
              onChange={handleExamSelectionChange}
            >
              {exams.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.title || e.code} <span className="text-slate-400 text-xs ml-1">({e.code})</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedExamIds.length > 0 && (
            <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-500 block mb-1">Chọn phiên bản cho từng đề thi (Mặc định bản mới nhất):</span>
              {selectedExamIds.map((examId) => {
                const exam = exams.find((e) => e.id === examId);
                const versions = examVersionsMap[examId] || [];
                return (
                  <div key={examId} className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="font-semibold text-slate-700 truncate max-w-[280px]">{exam?.title || exam?.code}</span>
                    <Form.Item
                      name={["examVersions", examId]}
                      className="mb-0"
                      initialValue=""
                    >
                      <Select className="w-52 text-xs font-medium" size="small">
                        <Select.Option value="">Bản mới nhất (Latest)</Select.Option>
                        {versions.map((v: any) => (
                          <Select.Option key={v.id} value={v.id}>
                            Phiên bản {v.versionNumber} ({v.questionCount} câu) {v.isCurrent ? "★" : ""}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="classId" label={<span>Lớp học <span className="text-slate-400 font-normal text-xs">(tùy chọn)</span></span>}>
                <Select showSearch placeholder="Chọn lớp học..." optionFilterProp="children" className="rounded-xl"
                  allowClear
                  onChange={(val) => {
                    setSelectedClassForExam(val);
                    examForm.setFieldValue("studentIds", []);
                  }}
                >
                  {classes.map((c) => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxAttempts" label={<span>Số lần làm tối đa <span className="text-slate-400 font-normal text-xs">(bỏ trống = vĩnh viễn)</span></span>}>
                <InputNumber min={1} placeholder="Ví dụ: 3" className="rounded-xl w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="studentIds"
            label={<span>Học sinh cụ thể <span className="text-slate-400 font-normal text-xs">(bỏ trống = toàn bộ lớp)</span></span>}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder={allStudents.length === 0 ? "Đang tải học sinh..." : "Chọn học sinh cụ thể (tùy chọn)..."}
              optionFilterProp="label"
              className="rounded-xl"
              options={getStudentsForClass(selectedClassForExam).map((s) => ({
                key: s.id,
                value: s.studentProfile?.id || s.id,
                label: `${s.fullName || s.code} @${s.code}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="title" label="Tiêu đề (tùy chọn)">
            <Input placeholder="VD: Bài kiểm tra Unit 1" className="rounded-xl" />
          </Form.Item>
          <Form.Item name="instructions" label="Hướng dẫn (tùy chọn)">
            <Input.TextArea rows={3} placeholder="Hướng dẫn làm bài cho học sinh..." className="rounded-xl" />
          </Form.Item>
          <Divider className="my-4" />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setExamFormOpen(false)} className="rounded-xl">Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              className="rounded-xl px-6 font-semibold shadow-md shadow-indigo-500/20">
              Giao bài thi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== CURRICULUM ASSIGNMENT FORM MODAL ==================== */}
      <Modal open={curriculumFormOpen} onCancel={() => setCurriculumFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-purple-700 font-bold text-lg"><BookOutlined />Giao Giáo Trình Trực Tiếp</div>}
        width={600}
      >
        <Form form={curriculumForm} layout="vertical" onFinish={handleCreateCurriculumAssignment} className="pt-2">
          <Form.Item name="curriculumId" label="Giáo trình"
            rules={[{ required: true, message: "Vui lòng chọn giáo trình!" }]}>
            <Select showSearch placeholder="Chọn giáo trình..." optionFilterProp="children" className="rounded-xl">
              {curriculums.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.title || c.code} <span className="text-slate-400 text-xs ml-1">({c.code})</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="classId" label={<span>Lọc học sinh theo lớp <span className="text-slate-400 font-normal text-xs">(tùy chọn – để lọc danh sách học sinh)</span></span>}>
            <Select showSearch placeholder="Chọn lớp để lọc học sinh..." optionFilterProp="children" className="rounded-xl"
              allowClear
              onChange={(val) => {
                setSelectedClassForCurriculum(val);
                curriculumForm.setFieldValue("studentIds", []);
              }}
            >
              {classes.map((c) => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="studentIds" label={<span>Học sinh <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs">(bắt buộc chọn ít nhất 1)</span></span>}
            rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 học sinh!" }]}>
            <Select
              mode="multiple"
              showSearch
              placeholder={allStudents.length === 0 ? "Đang tải học sinh..." : "Chọn học sinh..."}
              optionFilterProp="label"
              className="rounded-xl"
              options={getStudentsForClass(selectedClassForCurriculum).map((s) => ({
                key: s.id,
                value: s.studentProfile?.id || s.id,
                label: `${s.fullName || s.code} @${s.code}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="maxAttempts" label={<span>Số lần làm tối đa <span className="text-slate-400 font-normal text-xs">(bỏ trống = vĩnh viễn)</span></span>}>
            <InputNumber min={1} placeholder="Ví dụ: 5" className="rounded-xl w-full" />
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề (tùy chọn)">
            <Input placeholder="VD: Giáo trình A1 - Học kỳ 1" className="rounded-xl" />
          </Form.Item>
          <Form.Item name="instructions" label="Hướng dẫn (tùy chọn)">
            <Input.TextArea rows={3} placeholder="Hướng dẫn học tập cho học sinh..." className="rounded-xl" />
          </Form.Item>
          <Divider className="my-4" />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setCurriculumFormOpen(false)} className="rounded-xl">Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              className="rounded-xl px-6 font-semibold shadow-md shadow-purple-500/20"
              style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
            >
              Giao giáo trình
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Analytics Modals */}
      <ExamAnalyticsModal assignmentId={examAnalyticsId} open={!!examAnalyticsId} onClose={() => setExamAnalyticsId(null)} />
      <CurriculumAnalyticsModal assignmentId={curriculumAnalyticsId} open={!!curriculumAnalyticsId} onClose={() => setCurriculumAnalyticsId(null)} />
    </ConfigProvider>
  );
}
