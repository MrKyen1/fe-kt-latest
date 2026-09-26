import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popover,
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
  Segmented,
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
  ReloadOutlined,
  BankOutlined,
  SearchOutlined,
  FilterOutlined,
  GlobalOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { ClipboardList, Info, Building2, Filter } from "lucide-react";

import { teacherLearningService } from "../../../services/teacherLearningService";
import { learningCmsService } from "../../../services/learningCmsService";
import { academicService } from "../../../services/academicService";
import { userService } from "../../../services/userService";
import { useAuth } from "../../../contexts/AuthContext";
import { Can } from "../../../components/Can";
import { getErrorMessage } from "../../../services/apiClient";
import { Center, Specialization } from "../../../types/backend";
import { ExamAnalyticsModal } from "./components/ExamAnalyticsModal";

const { Title, Text } = Typography;

// ==================== TYPES ====================
type AssignmentStatus = "active" | "cancelled";

interface ExamOption {
  id: string;
  title?: string;
  code?: string;
  status?: string;
  examType?: string;
  specializationId?: string;
}
interface CurriculumOption {
  id: string;
  title?: string;
  code?: string;
  status?: string;
  specializationId?: string;
}
interface ClassOption {
  id: string;
  name?: string;
  centerId?: string;
  specializationId?: string;
  specialization?: { id?: string; name?: string };
}
interface StudentOption {
  id: string;
  fullName?: string;
  code?: string;
  studentProfile?: { id?: string; classes?: { id: string; centerId?: string; class?: { centerId?: string } }[] };
}

// ==================== STATUS TAG ====================
const statusTag = (status: AssignmentStatus) => {
  if (status === "active")
    return <Tag color="success" className="rounded-full border-none text-xs font-semibold px-3">Đang hoạt động</Tag>;
  return <Tag color="default" className="rounded-full border-none text-xs font-semibold px-3">Đã huỷ</Tag>;
};

const maxAttemptsTag = (n?: number | null) => {
  if (n === 1) {
    return <Tag color="purple" className="rounded-full border-none text-xs font-semibold">Đề kiểm tra</Tag>;
  }
  return <Tag color="blue" className="rounded-full border-none text-xs font-semibold">Đề ôn tập</Tag>;
};

// ==================== HELPER FORMATTERS ====================
function formatDuration(seconds?: number | null) {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs} giây`;
  return `${mins} phút ${secs > 0 ? `${secs}s` : ""}`;
}

function formatDateTime(dateStr?: string | null) {
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

// ==================== EXAM ANALYTICS MODAL ====================
// Extracted to ./components/ExamAnalyticsModal.tsx

// ==================== CURRICULUM ANALYTICS MODAL ====================
function CurriculumAnalyticsModal({
  assignmentId, open, onClose,
}: { assignmentId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !assignmentId) {
      setData(null);
      setDetail(null);
      return;
    }
    setLoading(true);
    Promise.allSettled([
      teacherLearningService.curriculumAssignments.analytics(assignmentId),
      teacherLearningService.curriculumAssignments.get(assignmentId),
    ])
      .then(([analyticsRes, detailRes]) => {
        if (analyticsRes.status === "fulfilled") {
          setData(analyticsRes.value);
        }
        if (detailRes.status === "fulfilled") {
          setDetail(detailRes.value);
        }
      })
      .catch((err) => message.error(getErrorMessage(err, "Không thể tải analytics"), 5))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  const studentsList = useMemo(() => {
    if (data?.students && Array.isArray(data.students) && data.students.length > 0) {
      return data.students;
    }
    const raw = detail?.students || [];
    return raw.map((s: any) => ({
      studentId: s.studentId || s.student?.id,
      code: s.student?.user?.code || s.student?.code || "—",
      fullName: s.student?.user?.fullName || s.student?.fullName || "Học sinh",
      email: s.student?.user?.email || s.student?.email || "—",
      status: s.status || "assigned",
      progressPercentage: parseFloat(s.progressPercentage || "0"),
      finishedExamsCount: s.finishedExamsCount || 0,
      totalRequiredExamsCount: s.totalRequiredExamsCount || 0,
      finishedAt: s.finishedAt,
    }));
  }, [data, detail]);

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={<div className="flex items-center gap-2 text-purple-700"><BarChartOutlined /><span className="font-bold">Thống kê giáo trình học được giao</span></div>}
      centered
      maskClosable={false}
      width={780}
      className="rounded-3xl overflow-hidden"
      styles={{ body: { maxHeight: "74vh", overflowY: "auto", padding: "16px 24px" } }}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spin size="large" /></div>
      ) : data ? (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-purple-50 text-center">
              <Statistic title="Học sinh được giao" value={data.assignedCount ?? studentsList.length}
                prefix={<TeamOutlined className="text-purple-500" />} valueStyle={{ color: "#7c3aed" }} />
            </Card></Col>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-emerald-50 text-center">
              <Statistic title="Đã hoàn thành" value={data.completedCount ?? 0}
                prefix={<CheckCircleOutlined className="text-emerald-500" />} valueStyle={{ color: "#10b981" }} />
            </Card></Col>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-amber-50 text-center">
              <Statistic title="Đang học" value={data.inProgressCount ?? 0}
                prefix={<ClockCircleOutlined className="text-amber-500" />} valueStyle={{ color: "#f59e0b" }} />
            </Card></Col>
            <Col span={6}><Card className="rounded-2xl border-slate-100 bg-slate-50 text-center">
              <Statistic title="Tiến độ TB" value={`${data.averageProgress?.toFixed(1) ?? "0"}%`}
                prefix={<BarChartOutlined className="text-slate-500" />} valueStyle={{ color: "#475569" }} />
            </Card></Col>
          </Row>
          <Progress percent={Math.round(data.averageProgress ?? 0)}
            strokeColor={{ "0%": "#7c3aed", "100%": "#10b981" }}
            format={(p) => `Tiến độ TB: ${p}%`} />

          {/* Student Progress Table */}
          {studentsList.length > 0 && (
            <Card className="rounded-2xl border-slate-100 shadow-sm" bodyStyle={{ padding: "16px" }}>
              <div className="text-slate-700 font-bold text-sm mb-3 flex items-center justify-between">
                <span>Tiến độ từng học sinh</span>
                <span className="text-xs text-slate-400 font-normal">Tổng {studentsList.length} học sinh</span>
              </div>
              <Table
                size="small"
                pagination={{ pageSize: 5 }}
                rowKey="studentId"
                dataSource={studentsList}
                columns={[
                  {
                    title: "Học sinh",
                    render: (_: any, r: any) => (
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{r.fullName}</div>
                        <div className="text-[10px] text-slate-400">{r.code} {r.email && `• ${r.email}`}</div>
                      </div>
                    ),
                  },
                  {
                    title: "Trạng thái",
                    width: 130,
                    render: (_: any, r: any) => {
                      if (r.status === "finished" || r.progressPercentage >= 100) {
                        return <Tag color="success" className="rounded-full text-xs font-semibold">Hoàn thành</Tag>;
                      }
                      if (r.status === "in_progress" || r.progressPercentage > 0) {
                        return <Tag color="warning" className="rounded-full text-xs font-semibold">Đang học</Tag>;
                      }
                      return <Tag color="default" className="rounded-full text-xs text-slate-400">Chưa bắt đầu</Tag>;
                    },
                  },
                  {
                    title: "Tiến độ",
                    width: 180,
                    render: (_: any, r: any) => (
                      <Progress percent={Math.round(r.progressPercentage || 0)} size="small"
                        strokeColor={{ "0%": "#7c3aed", "100%": "#10b981" }} />
                    ),
                  },
                  {
                    title: "Số bài thi",
                    width: 110,
                    align: "center" as const,
                    render: (_: any, r: any) => (
                      <span className="text-xs font-semibold text-slate-600">
                        {r.finishedExamsCount} {r.totalRequiredExamsCount > 0 ? `/ ${r.totalRequiredExamsCount}` : ""}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </div>
      ) : <Empty description="Chưa có dữ liệu thống kê" />}
    </Modal>
  );
}

// ==================== MAIN COMPONENT ====================
export default function TeacherAssignments() {
  const { user, refreshProfile } = useAuth();
  const userRoleCode = typeof user?.role === "object" ? (user?.role as any)?.code : user?.role;
  const isTeacher = userRoleCode === "teacher";
  const [activeTab, setActiveTab] = useState("exam");

  // ---- Data ----
  const [centers, setCenters] = useState<Center[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  const [examAssignments, setExamAssignments] = useState<any[]>([]);
  const [curriculumAssignments, setCurriculumAssignments] = useState<any[]>([]);

  // ---- Filtering & Scopes ----
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [assignmentScope, setAssignmentScope] = useState<"my" | "center" | "all">(isTeacher ? "my" : "center");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [centerInitialized, setCenterInitialized] = useState(false);

  // ---- Loading ----
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- Modals ----
  const [examFormOpen, setExamFormOpen] = useState(false);
  const [curriculumFormOpen, setCurriculumFormOpen] = useState(false);
  const [examAnalyticsId, setExamAnalyticsId] = useState<string | null>(null);
  const [curriculumAnalyticsId, setCurriculumAnalyticsId] = useState<string | null>(null);

  // ---- Forms ----
  const [examForm] = Form.useForm();
  const [curriculumForm] = Form.useForm();

  // ---- Selected class (for filtering students and exams/curriculums) ----
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

  // ==================== USER CENTERS & SPECIALIZATIONS ====================
  const teacherClassIds = useMemo(() => {
    return (user?.teacherProfile?.classes?.map((c: any) => c.id || c.classId) ?? []).filter(Boolean);
  }, [user]);

  const userCenters = useMemo(() => {
    const set = new Set<string>();
    if (user?.centerId) set.add(user.centerId);
    if (user?.teacherProfile?.centerId) set.add(user.teacherProfile.centerId);
    (user?.teacherProfile?.classes ?? []).forEach((c: any) => {
      const cid = c.centerId || c.center?.id || c.class?.centerId || c.class?.center?.id;
      if (cid) set.add(cid);
    });
    // Match with allClasses as well
    allClasses.filter((c) => teacherClassIds.includes(c.id)).forEach((c) => {
      if (c.centerId) set.add(c.centerId);
    });
    return Array.from(set);
  }, [user, allClasses, teacherClassIds]);

  const teacherSpecializationIds = useMemo(() => {
    const set = new Set<string>();
    (user?.teacherProfile?.specializationIds ?? []).forEach((id: string) => set.add(id));
    (user?.teacherProfile?.specializations ?? []).forEach((s: any) => set.add(s.id));
    (allClasses ?? []).forEach((c: any) => {
      if (teacherClassIds.includes(c.id) && c.specializationId) {
        set.add(c.specializationId);
      }
    });
    return Array.from(set);
  }, [user, allClasses, teacherClassIds]);

  // ==================== LOAD DATA ====================
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [
        examsRes,
        curriculumsRes,
        classesRes,
        studentsRes,
        examAssignmentsRes,
        curriculumAssignmentsRes,
        centersRes,
        specializationsRes,
      ] = await Promise.allSettled([
        learningCmsService.exams.list({ status: "published", limit: 100 }),
        learningCmsService.curriculums.list({ status: "published", limit: 100 }),
        academicService.classes.list({ limit: 100, isActive: true }),
        userService.list({ roleCode: "student" }),
        teacherLearningService.examAssignments.list({ limit: 100 }),
        teacherLearningService.curriculumAssignments.list({ limit: 100 }),
        academicService.centers.list({ limit: 100 }),
        academicService.specializations.list({ limit: 100 }),
      ]);

      setExams(examsRes.status === "fulfilled" ? examsRes.value?.data ?? [] : []);
      setCurriculums(curriculumsRes.status === "fulfilled" ? curriculumsRes.value?.data ?? [] : []);
      const rawClasses = classesRes.status === "fulfilled" ? classesRes.value ?? [] : (user?.teacherProfile?.classes ?? []);
      setAllClasses(rawClasses);
      setClasses(rawClasses);
      setAllStudents(studentsRes.status === "fulfilled" ? studentsRes.value ?? [] : []);

      const rawExams = examAssignmentsRes.status === "fulfilled" ? examAssignmentsRes.value?.data ?? [] : [];
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

      const rawCurriculums = curriculumAssignmentsRes.status === "fulfilled" ? curriculumAssignmentsRes.value?.data ?? [] : [];
      setCurriculumAssignments(rawCurriculums);

      // Asynchronously fetch curriculum assignment details to load recipient student profiles
      Promise.all(
        rawCurriculums.map((item: any) =>
          teacherLearningService.curriculumAssignments.get(item.id)
            .catch(() => item)
        )
      ).then((detailed) => {
        setCurriculumAssignments(detailed);
      });

      const rawCenters = (centersRes.status === "fulfilled" ? centersRes.value ?? [] : []).filter((c: any) => c.isActive !== false);
      setCenters(rawCenters);
      setSpecializations(specializationsRes.status === "fulfilled" ? specializationsRes.value ?? [] : []);
    } catch (err: any) {
      message.error(getErrorMessage(err, "Tải dữ liệu thất bại"), 5);
    } finally {
      setLoading(false);
    }
  };

  // Auto initialize selectedCenterId based on user context
  useEffect(() => {
    if (!centerInitialized && centers.length > 0) {
      if (userCenters.length > 0) {
        setSelectedCenterId(userCenters[0]);
      } else if (user?.centerId) {
        setSelectedCenterId(user.centerId);
      } else if (!isTeacher && centers.length > 0) {
        setSelectedCenterId(centers[0].id);
      }
      setCenterInitialized(true);
    }
  }, [centers, userCenters, user?.centerId, centerInitialized, isTeacher]);

  // ==================== HELPER RESOLVERS ====================
  const getCenterName = (centerId?: string) => {
    if (!centerId) return undefined;
    return centers.find((c) => c.id === centerId)?.name;
  };

  const getSpecializationName = (specId?: string) => {
    if (!specId) return undefined;
    return specializations.find((s) => s.id === specId)?.name;
  };

  const getClassSpecializationId = (classId?: string) => {
    if (!classId) return undefined;
    const cls = allClasses.find((c) => c.id === classId);
    return cls?.specializationId || (cls as any)?.specialization?.id;
  };

  const getRecordCenterId = (record: any) => {
    if (record.class?.centerId) return record.class.centerId;
    if (record.class?.center?.id) return record.class.center.id;
    if (record.classId) {
      const cls = allClasses.find((c) => c.id === record.classId);
      if (cls?.centerId) return cls.centerId;
    }
    if (record.students?.length || record.studentIds?.length) {
      const targetStudentIds =
        record.students?.map((s: any) => s.studentId || s.student?.id || s.id) || record.studentIds || [];
      const matchedStudent = allStudents.find(
        (s) => targetStudentIds.includes(s.id) || targetStudentIds.includes(s.studentProfile?.id)
      );
      if (matchedStudent) {
        const studentClasses = matchedStudent.studentProfile?.classes ?? [];
        for (const sc of studentClasses) {
          const cid = (sc as any).centerId || (sc as any).center?.id || (sc as any).class?.centerId;
          if (cid) return cid;
          const matchedCls = allClasses.find((c) => c.id === (sc.id || (sc as any).classId));
          if (matchedCls?.centerId) return matchedCls.centerId;
        }
      }
    }
    if (
      record.teacherId &&
      (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)
    ) {
      return userCenters[0] || user?.centerId;
    }
    return undefined;
  };

  const isMyRecord = (record: any) => {
    if (!isTeacher) return true;
    if (
      record.teacherId &&
      (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)
    ) {
      return true;
    }
    if (record.classId && teacherClassIds.includes(record.classId)) {
      return true;
    }
    if (record.students?.length || record.studentIds?.length) {
      const targetStudentIds =
        record.students?.map((s: any) => s.studentId || s.student?.id || s.id) || record.studentIds || [];
      const hasMyStudent = allStudents.some((s) => {
        if (!targetStudentIds.includes(s.id) && !targetStudentIds.includes(s.studentProfile?.id)) return false;
        const studentClassIds = [
          ...((s.studentProfile as any)?.classIds ?? []),
          ...((s.studentProfile as any)?.classes?.map((c: any) => c.id || c.classId) ?? []),
        ];
        return studentClassIds.some((cid) => teacherClassIds.includes(cid));
      });
      if (hasMyStudent) return true;
    }
    return false;
  };

  // ==================== FILTERED LISTS ====================

  /**
   * Phân giải tên học sinh từ đối tượng recipient (hỗ trợ cả examAssignment và curriculumAssignment)
   */
  const resolveStudentName = useCallback(
    (s: any): string => {
      if (!s) return "Học sinh";
      const directName =
        s.student?.user?.fullName ||
        s.student?.fullName ||
        s.user?.fullName ||
        s.studentName ||
        s.fullName;
      if (directName) return directName;

      const targetId = s.studentId || s.student?.id || s.id || (typeof s === "string" ? s : undefined);
      if (targetId) {
        const found = allStudents.find(
          (st) =>
            st.id === targetId ||
            st.studentProfile?.id === targetId ||
            (st as any).student?.id === targetId ||
            (st as any).studentProfileId === targetId
        );
        if (found) {
          return found.fullName || found.code || targetId;
        }
      }

      return targetId || "Học sinh";
    },
    [allStudents]
  );

  const filteredExamAssignments = useMemo(() => {
    return examAssignments.filter((record) => {
      const itemCenterId = getRecordCenterId(record);

      // Center Filter
      if (selectedCenterId !== "all") {
        if (itemCenterId && itemCenterId !== selectedCenterId) return false;
        if (!itemCenterId && record.classId) {
          const cls = allClasses.find((c) => c.id === record.classId);
          if (cls?.centerId && cls.centerId !== selectedCenterId) return false;
        }
      }

      // Scope Filter
      if (assignmentScope === "my" && isTeacher) {
        if (!isMyRecord(record)) return false;
      }

      // Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const title = (record.title || "").toLowerCase();
        const examNames = (record.exams || []).map((e: any) => `${e.exam?.title || ""} ${e.exam?.code || ""}`).join(" ").toLowerCase();
        const clsName = (record.class?.name || allClasses.find((c) => c.id === record.classId)?.name || "").toLowerCase();
        const centerName = (getCenterName(itemCenterId) || "").toLowerCase();
        const studentNames = (record.students || []).map((s: any) => resolveStudentName(s)).join(" ").toLowerCase();
        if (!title.includes(kw) && !examNames.includes(kw) && !clsName.includes(kw) && !centerName.includes(kw) && !studentNames.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [examAssignments, selectedCenterId, assignmentScope, isTeacher, searchKeyword, allClasses, centers, allStudents, teacherClassIds, resolveStudentName]);

  const filteredCurriculumAssignments = useMemo(() => {
    return curriculumAssignments.filter((record) => {
      const itemCenterId = getRecordCenterId(record);

      // Center Filter
      if (selectedCenterId !== "all") {
        if (itemCenterId && itemCenterId !== selectedCenterId) return false;
        if (!itemCenterId && record.classId) {
          const cls = allClasses.find((c) => c.id === record.classId);
          if (cls?.centerId && cls.centerId !== selectedCenterId) return false;
        }
      }

      // Scope Filter
      if (assignmentScope === "my" && isTeacher) {
        if (!isMyRecord(record)) return false;
      }

      // Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const title = (record.title || record.curriculum?.title || "").toLowerCase();
        const curCode = (record.curriculum?.code || "").toLowerCase();
        const clsName = (record.class?.name || allClasses.find((c) => c.id === record.classId)?.name || "").toLowerCase();
        const centerName = (getCenterName(itemCenterId) || "").toLowerCase();
        const studentNames = (record.students || []).map((s: any) => resolveStudentName(s)).join(" ").toLowerCase();
        if (!title.includes(kw) && !curCode.includes(kw) && !clsName.includes(kw) && !centerName.includes(kw) && !studentNames.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [curriculumAssignments, selectedCenterId, assignmentScope, isTeacher, searchKeyword, allClasses, centers, allStudents, teacherClassIds, resolveStudentName]);

  // ==================== MODAL OPTIONS ====================
  const teacherAssignedClasses = useMemo(() => {
    if (!isTeacher) return [];
    const authClasses = user?.teacher?.classes || [];
    if (authClasses.length > 0) {
      return authClasses
        .filter((tc: any) => tc.isActive !== false && tc.class && tc.class.isActive !== false)
        .map((tc: any) => ({
          id: tc.classId,
          name: tc.class.name,
          centerId: tc.class.centerId,
          specializationId: tc.class.specializationId,
          center: tc.class.center,
          specialization: tc.class.specialization,
          specializationName: tc.class.specialization?.name,
        }));
    }
    // Fallback if auth profile classes is not yet populated
    return (user?.teacherProfile?.classes || []).map((c: any) => {
      const spec = specializations.find((s) => s.id === c.specializationId);
      return {
        ...c,
        specializationName: spec?.name || c.specialization?.name,
      };
    });
  }, [isTeacher, user, specializations]);

  const modalClasses = useMemo(() => {
    let list = allClasses;
    if (selectedCenterId !== "all") {
      list = list.filter((c) => c.centerId === selectedCenterId);
    } else if (isTeacher && userCenters.length > 0) {
      list = list.filter((c) => c.centerId && userCenters.includes(c.centerId));
    }
    return list;
  }, [allClasses, selectedCenterId, isTeacher, userCenters]);

  const assignableClasses = useMemo(() => {
    if (isTeacher) {
      return teacherAssignedClasses;
    }
    return modalClasses;
  }, [isTeacher, teacherAssignedClasses, modalClasses]);

  const modalExams = useMemo(() => {
    if (selectedClassForExam) {
      const classSpecId = isTeacher
        ? teacherAssignedClasses.find((c: any) => c.id === selectedClassForExam)?.specializationId || getClassSpecializationId(selectedClassForExam)
        : getClassSpecializationId(selectedClassForExam);
      if (classSpecId) {
        return exams.filter((e) => e.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return exams.filter((e) => e.specializationId && teacherSpecializationIds.includes(e.specializationId));
    }
    return exams;
  }, [exams, selectedClassForExam, allClasses, isTeacher, teacherSpecializationIds, teacherAssignedClasses]);

  const modalDirectCurriculums = useMemo(() => {
    if (selectedClassForCurriculum) {
      const classSpecId = getClassSpecializationId(selectedClassForCurriculum);
      if (classSpecId) {
        return curriculums.filter((c) => c.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return curriculums.filter((c) => c.specializationId && teacherSpecializationIds.includes(c.specializationId));
    }
    return curriculums;
  }, [curriculums, selectedClassForCurriculum, allClasses, isTeacher, teacherSpecializationIds]);

  const handleClassChangeForExam = (classId?: string) => {
    setSelectedClassForExam(classId);
    examForm.setFieldValue("studentIds", []);
    if (classId) {
      const classSpecId = isTeacher
        ? teacherAssignedClasses.find((c: any) => c.id === classId)?.specializationId || getClassSpecializationId(classId)
        : getClassSpecializationId(classId);
      if (classSpecId) {
        const currentExamIds: string[] = examForm.getFieldValue("examIds") || [];
        const validExamIds = currentExamIds.filter((id) => {
          const ex = exams.find((e) => e.id === id);
          return ex && ex.specializationId === classSpecId;
        });
        if (validExamIds.length < currentExamIds.length) {
          examForm.setFieldValue("examIds", validExamIds);
          setSelectedExamIds(validExamIds);
        }
      }
    }
  };

  const handleClassChangeForCurriculum = (classId?: string) => {
    setSelectedClassForCurriculum(classId);
    curriculumForm.setFieldValue("studentIds", []);
    if (classId) {
      const classSpecId = getClassSpecializationId(classId);
      if (classSpecId) {
        const currentCurriculumId = curriculumForm.getFieldValue("curriculumId");
        if (currentCurriculumId) {
          const curr = curriculums.find((c) => c.id === currentCurriculumId);
          if (curr && curr.specializationId && curr.specializationId !== classSpecId) {
            curriculumForm.setFieldValue("curriculumId", undefined);
            message.info("Đã tự động bỏ chọn giáo trình không cùng môn học với lớp vừa chọn");
          }
        }
      }
    }
  };

  const handleResetFilters = () => {
    const defaultCenter = userCenters.length > 0 ? userCenters[0] : (user?.centerId || "all");
    setSelectedCenterId(defaultCenter);
    setAssignmentScope(isTeacher ? "my" : "center");
    setSearchKeyword("");
  };

  /**
   * Lọc học sinh theo lớp và trung tâm.
   */
  const getStudentsForClass = (classId?: string) => {
    let list = allStudents;
    const activeCenterId = selectedCenterId !== "all" ? selectedCenterId : (userCenters[0] || undefined);

    if (activeCenterId) {
      list = allStudents.filter((s) => {
        const studentClasses = s.studentProfile?.classes ?? [];
        return studentClasses.some((sc: any) => {
          const matchedClass = allClasses.find((c) => c.id === (sc.id || sc.classId));
          return matchedClass && matchedClass.centerId === activeCenterId;
        });
      });
    }

    if (!classId) return list;
    return list.filter((s) => {
      const classIds = (s.studentProfile as any)?.classIds ?? [];
      if (classIds.includes(classId)) return true;
      const classesArr = s.studentProfile?.classes ?? [];
      return classesArr.some((c: any) => c.id === classId || c.classId === classId);
    });
  };

  // ==================== EXAM ASSIGNMENT HANDLERS ====================
  const handleCreateExamAssignment = async (values: any) => {
    const examIds: string[] = Array.isArray(values.examIds) ? values.examIds : [values.examIds];
    if (!examIds.length) { message.warning("Vui lòng chọn ít nhất 1 bài thi!"); return; }
    const rawStudentIds = Array.isArray(values.studentIds) ? values.studentIds.filter(Boolean) : [];
    if (!values.classId && !rawStudentIds.length) {
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

      // NOTE: maxAttempts da bi xoa (migration 1780000030000).
      // Backend tu dong biet day la de kiem tra hay on tap qua examType.
      await teacherLearningService.examAssignments.create({
        exams: examsPayload,
        classId: values.classId || undefined,
        studentIds: rawStudentIds.length ? Array.from(new Set(rawStudentIds)) : undefined,
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
      const msg = getErrorMessage(err, "Giao bài thi thất bại");
      message.error(msg, 5);
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
        } catch (err: any) {
          message.error(getErrorMessage(err, "Huỷ thất bại"), 5);
        }
      },
    });
  };

  // ==================== CURRICULUM ASSIGNMENT HANDLERS ====================
  const handleCreateCurriculumAssignment = async (values: any) => {
    const rawStudentIds = Array.isArray(values.studentIds) ? values.studentIds.filter(Boolean) : [];
    if (!values.classId && !rawStudentIds.length) {
      message.warning("Vui lòng chọn lớp học hoặc ít nhất 1 học sinh!");
      return;
    }

    let resolvedStudentIds = rawStudentIds;
    if (values.classId && !resolvedStudentIds.length) {
      const classStudents = getStudentsForClass(values.classId);
      resolvedStudentIds = classStudents
        .map((s: any) => s.studentProfile?.id || s.id)
        .filter(Boolean);
      if (!resolvedStudentIds.length) {
        message.warning("Lớp học đã chọn hiện chưa có học sinh nào!");
        return;
      }
    }

    try {
      setSubmitting(true);
      await teacherLearningService.curriculumAssignments.create({
        curriculumId: values.curriculumId,
        studentIds: Array.from(new Set(resolvedStudentIds)),
        classId: values.classId || undefined,
        title: values.title || undefined,
        instructions: values.instructions || undefined,
      });
      message.success("Giao giáo trình thành công!");
      curriculumForm.resetFields();
      setSelectedClassForCurriculum(undefined);
      setCurriculumFormOpen(false);
      loadAll();
    } catch (err: any) {
      const msg = getErrorMessage(err, "Giao giáo trình thất bại");
      message.error(msg, 5);
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
        } catch (err: any) {
          message.error(getErrorMessage(err, "Huỷ thất bại"), 5);
        }
      },
    });
  };

  // ==================== TABLE COLUMNS ====================
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
      title: "Trung tâm",
      render: (_: any, record: any) => {
        const centerId = getRecordCenterId(record);
        const centerName = getCenterName(centerId);
        return centerName ? (
          <Tag color="cyan" className="rounded-full px-2.5 py-0.5 border-none font-medium">
            <BankOutlined className="mr-1" />
            {centerName}
          </Tag>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
    {
      title: "Lớp học",
      render: (_: any, record: any) => record.class?.name
        ? <Tag color="blue" className="rounded-full">{record.class.name}</Tag>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      title: "Người giao",
      render: (_: any, record: any) => {
        const isMe =
          (record.teacherId && (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)) ||
          (isTeacher && record.classId && teacherClassIds.includes(record.classId));
        const teacherName =
          record.teacher?.user?.fullName ||
          record.teacher?.fullName ||
          record.teacher?.name ||
          (isMe ? user?.fullName : undefined);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-slate-700">{teacherName || "—"}</span>
            {isMe && (
              <Tag color="purple" className="rounded-full px-1.5 py-0 border-none text-[10px] font-bold">
                Tôi
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Đối tượng",
      render: (_: any, record: any) => {
        const students = record.students || [];
        const studentList = students.length > 0 ? students : (record.studentIds || []).map((id: string) => ({ studentId: id }));
        const cnt = record.studentIds?.length ?? studentList.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs">
              {studentList.map((s: any, idx: number) => {
                const name = resolveStudentName(s);
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
      title: "Hình thức",
      render: (_: any, record: any) => {
        const examItems = record.exams || [];
        const isExam = examItems.some((e: any) => e.exam?.examType === "exam");
        return isExam ? (
          <Tag color="purple" className="rounded-full border-none text-xs font-semibold">
            Đề kiểm tra
          </Tag>
        ) : (
          <Tag color="blue" className="rounded-full border-none text-xs font-semibold">
            Đề ôn tập
          </Tag>
        );
      },
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
            <Can perform={["learning.manage", "learning.assign"]} mode="any">
              <Tooltip title="Huỷ assignment">
                <Button type="text" size="small" danger
                  icon={<CloseCircleOutlined className="text-slate-400 hover:text-rose-600" />}
                  onClick={() => handleCancelExamAssignment(record.id)}
                />
              </Tooltip>
            </Can>
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
      title: "Trung tâm",
      render: (_: any, record: any) => {
        const centerId = getRecordCenterId(record);
        const centerName = getCenterName(centerId);
        return centerName ? (
          <Tag color="cyan" className="rounded-full px-2.5 py-0.5 border-none font-medium">
            <BankOutlined className="mr-1" />
            {centerName}
          </Tag>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
    {
      title: "Lớp học",
      render: (_: any, record: any) => record.class?.name
        ? <Tag color="purple" className="rounded-full">{record.class.name}</Tag>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      title: "Người giao",
      render: (_: any, record: any) => {
        const isMe =
          (record.teacherId && (record.teacherId === user?.teacherProfile?.id || record.teacherId === user?.id)) ||
          (isTeacher && record.classId && teacherClassIds.includes(record.classId));
        const teacherName =
          record.teacher?.user?.fullName ||
          record.teacher?.fullName ||
          record.teacher?.name ||
          (isMe ? user?.fullName : undefined);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-slate-700">{teacherName || "—"}</span>
            {isMe && (
              <Tag color="purple" className="rounded-full px-1.5 py-0 border-none text-[10px] font-bold">
                Tôi
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Đối tượng",
      render: (_: any, record: any) => {
        const students = record.students || [];
        const studentList = students.length > 0 ? students : (record.studentIds || []).map((id: string) => ({ studentId: id }));
        const cnt = record.studentIds?.length ?? studentList.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs">
              {studentList.map((s: any, idx: number) => {
                const name = resolveStudentName(s);
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
        return <span className="text-sm text-slate-600"><TeamOutlined className="mr-1 text-emerald-400" />Toàn bộ lớp</span>;
      },
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
            <Can perform={["learning.manage", "learning.assign"]} mode="any">
              <Tooltip title="Huỷ assignment">
                <Button type="text" size="small" danger
                  icon={<CloseCircleOutlined className="text-slate-400 hover:text-rose-600" />}
                  onClick={() => handleCancelCurriculumAssignment(record.id)}
                />
              </Tooltip>
            </Can>
          )}
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================
  return (
    <ConfigProvider
      theme={{
        token: { borderRadius: 12, colorPrimary: "#0891b2", fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
        components: { Table: { headerBg: "#f8fafc", headerColor: "#475569", rowHoverBg: "#f1f5f9" } },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight flex items-center gap-2">
                  <ClipboardList size={26} className="text-indigo-600" />
                  Quản lý Giao bài
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

            {/* Filter & Search Toolbar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Center Select & Scope Filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BankOutlined className="text-indigo-500" />
                      Trung tâm:
                    </span>
                    <Select
                      value={selectedCenterId}
                      onChange={(val) => setSelectedCenterId(val)}
                      className="min-w-[210px]"
                      options={[
                        { value: "all", label: "Tất cả trung tâm (All)" },
                        ...centers.map((c) => ({
                          value: c.id,
                          label: (
                            <div className="flex items-center gap-2 justify-between">
                              <span className="truncate max-w-[180px]">{c.name}</span>
                              {userCenters.includes(c.id) && (
                                <Tag color="cyan" className="rounded-full text-[10px] py-0 px-1.5 m-0 font-medium">
                                  Của bạn
                                </Tag>
                              )}
                            </div>
                          ),
                        })),
                      ]}
                    />
                  </div>

                  <Divider orientation="vertical" className="h-6 hidden sm:block" />

                  {/* Scope Segmented */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FilterOutlined className="text-indigo-500" />
                      Phạm vi:
                    </span>
                    <Segmented
                      value={assignmentScope}
                      onChange={(val: any) => setAssignmentScope(val)}
                      options={
                        isTeacher
                          ? [
                            { label: "Bài của tôi", value: "my" },
                            { label: "Toàn trung tâm", value: "center" },
                            { label: "Tất cả (All)", value: "all" },
                          ]
                          : [
                            { label: "Theo trung tâm", value: "center" },
                            { label: "Tất cả hệ thống (All)", value: "all" },
                          ]
                      }
                    />
                  </div>
                </div>

                {/* Right: Search Input & Reset */}
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Tìm bài thi, giáo trình, lớp, học sinh..."
                    prefix={<SearchOutlined className="text-slate-400" />}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    allowClear
                    className="w-full sm:w-72 rounded-xl"
                  />
                  {(selectedCenterId !== "all" || (isTeacher ? assignmentScope !== "my" : assignmentScope !== "center") || searchKeyword) && (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleResetFilters}
                      className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-1 font-semibold"
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
              </div>

              {/* Status summary banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Đang lọc:</span>
                  <Tag color={selectedCenterId === "all" ? "orange" : "blue"} className="rounded-full">
                    {selectedCenterId === "all" ? "Tất cả trung tâm" : (centers.find((c) => c.id === selectedCenterId)?.name || "Trung tâm đã chọn")}
                  </Tag>
                  <Tag color={assignmentScope === "all" ? "purple" : assignmentScope === "my" ? "green" : "default"} className="rounded-full">
                    {assignmentScope === "my" ? "Chỉ bài của tôi" : assignmentScope === "center" ? "Toàn trung tâm" : "Tất cả (All)"}
                  </Tag>
                  {searchKeyword && (
                    <Tag color="cyan" className="rounded-full">
                      Từ khóa: "{searchKeyword}"
                    </Tag>
                  )}
                </div>
                <div className="text-slate-400 font-medium">
                  {activeTab === "exam" && `Hiển thị ${filteredExamAssignments.length} / ${examAssignments.length} bài thi`}
                  {activeTab === "curriculum" && `Hiển thị ${filteredCurriculumAssignments.length} / ${curriculumAssignments.length} giáo trình đã giao`}
                </div>
              </div>
            </div>

            {/* Tabs - ConfigProvider sets cardGutter so card tabs have visible spacing */}
            <ConfigProvider theme={{ components: { Tabs: { cardGutter: 8 } } }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                size="large"
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
                tabBarStyle={{ padding: "16px 16px 0", background: "white", marginBottom: 0 }}
                items={[
                  // ======= TAB 1: EXAM ASSIGNMENT =======
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
                          title="Giao bài thi cho học sinh"
                          description="Có thể chọn nhiều bài thi cùng lúc. Hãy chọn lớp học trước để hệ thống tự động lọc các đề thi thuộc đúng môn học của lớp."
                        />
                        <div className="!flex !justify-end !mt-[10px] !mb-4" style={{ marginTop: 10 }}>
                          <Can perform="learning.assign">
                            <Button type="primary" icon={<PlusOutlined />}
                              onClick={() => {
                                refreshProfile().catch(() => { });
                                examForm.resetFields();
                                setSelectedClassForExam(undefined);
                                setExamFormOpen(true);
                              }}
                              className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-cyan-500/20"
                              style={{ background: "#0891b2", borderColor: "#0891b2" }}
                            >
                              Giao Bài Thi Mới
                            </Button>
                          </Can>
                        </div>
                        {filteredExamAssignments.length === 0 ? (
                          <div className="py-16 text-center">
                            <Empty description={<span className="text-slate-400">Không tìm thấy bài thi nào phù hợp với bộ lọc hiện tại.<br />Hãy đổi bộ lọc hoặc nhấn "Giao Bài Thi Mới".</span>} />
                          </div>
                        ) : (
                          <Table dataSource={filteredExamAssignments} columns={examAssignmentColumns} rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                            className="rounded-2xl overflow-hidden" />
                        )}
                      </div>
                    ),
                  },

                  // ======= TAB 2: CURRICULUM ASSIGNMENT =======
                  {
                    key: "curriculum",
                    label: (
                      <span className="flex items-center gap-2 px-2">
                        <BookOutlined />
                        <span>Giao Giáo Trình</span>
                      </span>
                    ),
                    children: (
                      <div className="p-6">
                        <Alert
                          type="info"
                          showIcon
                          className="mb-4 rounded-xl"
                          title="Giao giáo trình cho học sinh"
                          description="Chọn lớp học và học sinh cụ thể (để trống ô học sinh để giao cho toàn bộ lớp). Hệ thống tự động theo dõi và đo lường tiến độ hoàn thành các bài thi trong giáo trình của từng học sinh."
                        />
                        <div className="!flex !justify-end !mt-[10px] !mb-4" style={{ marginTop: 10 }}>
                          <Can perform="learning.assign">
                            <Button type="primary" icon={<PlusOutlined />}
                              onClick={() => {
                                refreshProfile().catch(() => { });
                                curriculumForm.resetFields();
                                setSelectedClassForCurriculum(undefined);
                                setCurriculumFormOpen(true);
                              }}
                              className="rounded-xl h-10 px-5 font-semibold shadow-md shadow-cyan-500/20"
                              style={{ background: "#0891b2", borderColor: "#0891b2" }}
                            >
                              Giao Giáo Trình Mới
                            </Button>
                          </Can>
                        </div>
                        {filteredCurriculumAssignments.length === 0 ? (
                          <div className="py-16 text-center">
                            <Empty description={<span className="text-slate-400">Không tìm thấy giáo trình nào được giao phù hợp với bộ lọc hiện tại.<br />Hãy đổi bộ lọc hoặc nhấn "Giao Giáo Trình Mới".</span>} />
                          </div>
                        ) : (
                          <Table dataSource={filteredCurriculumAssignments} columns={curriculumAssignmentColumns} rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: false }} bordered={false}
                            className="rounded-2xl overflow-hidden" />
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </ConfigProvider>
          </div>
        </Spin>
      </div>

      {/* ==================== EXAM ASSIGNMENT FORM MODAL ==================== */}
      <Modal open={examFormOpen} onCancel={() => setExamFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-indigo-700 font-bold text-lg"><FileTextOutlined />Giao Bài Thi Mới</div>}
        centered
        maskClosable={false}
        width={640}
        styles={{
          body: {
            maxHeight: "74vh",
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: "8px",
          },
        }}
      >
        <Form form={examForm} layout="vertical" onFinish={handleCreateExamAssignment} className="pt-2">
          <Form.Item
            name="classId"
            label={
              <span>
                Lớp học <span className="text-slate-400 font-normal text-xs">(chọn lớp trước để hệ thống lọc danh sách đề thi theo đúng môn học)</span>
              </span>
            }
          >
            <Select
              showSearch
              placeholder="Chọn lớp học..."
              optionFilterProp="children"
              className="rounded-xl"
              allowClear
              onChange={handleClassChangeForExam}
            >
              {assignableClasses.map((c: any) => {
                const specName = c.specializationName || (getClassSpecializationId(c.id) && getSpecializationName(getClassSpecializationId(c.id)));
                return (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                    {specName && (
                      <span className="text-slate-400 text-xs ml-1.5 font-normal">
                        ({specName})
                      </span>
                    )}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-700 font-medium text-sm flex items-center gap-1">
                <span className="text-red-500">*</span> Bài thi <span className="text-slate-400 font-normal text-xs">(có thể chọn nhiều)</span>
              </span>
              {selectedClassForExam && getClassSpecializationId(selectedClassForExam) && (
                <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full font-medium">
                  Môn: {getSpecializationName(getClassSpecializationId(selectedClassForExam))} ({modalExams.length} đề thi)
                </span>
              )}
            </div>
            <Form.Item
              name="examIds"
              rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 bài thi!" }]}
              extra={
                selectedClassForExam && modalExams.length === 0 ? (
                  <span className="text-amber-600 text-xs mt-1 block">
                    Chưa có đề thi nào thuộc môn học này được xuất bản (Published).
                  </span>
                ) : undefined
              }
            >
              <Select
                mode="multiple"
                showSearch
                placeholder={selectedClassForExam ? "Chọn bài thi thuộc môn học của lớp..." : "Chọn bài thi..."}
                optionFilterProp="children"
                optionLabelProp="label"
                className="rounded-xl"
                onChange={handleExamSelectionChange}
              >
                {modalExams.map((e) => (
                  <Select.Option
                    key={e.id}
                    value={e.id}
                    label={`${e.examType === "exam" ? "[Kiểm tra] " : "[Ôn tập] "}${e.title || e.code}`}
                  >
                    <div className="flex items-center justify-between py-0.5">
                      <span>
                        <span className="font-semibold text-slate-700">{e.examType === "exam" ? "[Kiểm tra] " : "[Ôn tập] "}</span>
                        {e.title || e.code}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        {e.code && <span className="text-slate-400">({e.code})</span>}
                        {e.specializationId && getSpecializationName(e.specializationId) && (
                          <span className="text-indigo-500">• {getSpecializationName(e.specializationId)}</span>
                        )}
                      </div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {selectedExamIds.length > 0 && (
            <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-500 block mb-1">Chọn phiên bản cho từng đề thi (Mặc định bản mới nhất):</span>
              {selectedExamIds.map((examId) => {
                const exam = exams.find((e) => e.id === examId);
                const versions = examVersionsMap[examId] || [];
                return (
                  <div key={examId} className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="font-semibold text-slate-700 truncate max-w-[280px]">
                      {exam?.examType === "exam" ? "[Kiểm tra] " : "[Ôn tập] "}
                      {exam?.title || exam?.code}
                    </span>
                    <Form.Item
                      name={["examVersions", examId]}
                      className="mb-0"
                      initialValue=""
                    >
                      <Select className="w-52 text-xs font-medium" size="small">
                        <Select.Option value="">Bản mới nhất (Latest)</Select.Option>
                        {versions.map((v: any) => (
                          <Select.Option key={v.id} value={v.id}>
                            Phiên bản {v.versionNumber} ({v.questionCount} câu){v.isCurrent ? " (Hiện tại)" : ""}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          )}

          <Form.Item
            name="studentIds"
            label={<span>Học sinh cụ thể <span className="text-slate-400 font-normal text-xs">(bỏ trống = toàn bộ học sinh trong lớp)</span></span>}
            extra={!selectedClassForExam ? (
              <div className="text-amber-600 text-xs mt-1 flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span><b>Mẹo:</b> Hãy chọn <b>Lớp học</b> trước để hệ thống tự động lọc đúng học sinh thuộc lớp bạn phụ trách.</span>
              </div>
            ) : undefined}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder={allStudents.length === 0 ? "Đang tải học sinh..." : (selectedClassForExam ? "Chọn học sinh cụ thể trong lớp (hoặc bỏ trống để giao cả lớp)..." : "Chọn học sinh cụ thể...")}
              optionFilterProp="label"
              className="rounded-xl"
              options={getStudentsForClass(selectedClassForExam).map((s) => ({
                key: s.studentProfile?.id || s.id,
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
              className="rounded-xl px-6 font-semibold shadow-md shadow-cyan-500/20"
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
            >
              Giao bài thi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== CURRICULUM ASSIGNMENT FORM MODAL ==================== */}
      <Modal open={curriculumFormOpen} onCancel={() => setCurriculumFormOpen(false)} footer={null}
        title={<div className="flex items-center gap-2 text-purple-700 font-bold text-lg"><BookOutlined />Giao Giáo Trình Mới</div>}
        centered
        maskClosable={false}
        width={640}
        styles={{
          body: {
            maxHeight: "74vh",
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: "8px",
          },
        }}
      >
        <Form form={curriculumForm} layout="vertical" onFinish={handleCreateCurriculumAssignment} className="pt-2">
          <Form.Item
            name="classId"
            label={
              <span>
                Lớp học <span className="text-slate-400 font-normal text-xs">(chọn lớp trước để hệ thống lọc giáo trình theo đúng môn học)</span>
              </span>
            }
          >
            <Select
              showSearch
              placeholder="Chọn lớp học (tùy chọn)..."
              optionFilterProp="children"
              className="rounded-xl"
              allowClear
              onChange={handleClassChangeForCurriculum}
            >
              {assignableClasses.map((c: any) => {
                const specName = c.specializationName || (getClassSpecializationId(c.id) && getSpecializationName(getClassSpecializationId(c.id)));
                return (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                    {specName && (
                      <span className="text-slate-400 text-xs ml-1.5 font-normal">
                        ({specName})
                      </span>
                    )}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-700 font-medium text-sm flex items-center gap-1">
                <span className="text-red-500">*</span> Giáo trình
              </span>
              {selectedClassForCurriculum && getClassSpecializationId(selectedClassForCurriculum) && (
                <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 rounded-full font-medium">
                  Môn: {getSpecializationName(getClassSpecializationId(selectedClassForCurriculum))} ({modalDirectCurriculums.length} giáo trình)
                </span>
              )}
            </div>
            <Form.Item
              name="curriculumId"
              rules={[{ required: true, message: "Vui lòng chọn giáo trình!" }]}
              extra={
                selectedClassForCurriculum && modalDirectCurriculums.length === 0 ? (
                  <span className="text-amber-600 text-xs mt-1 block">
                    Chưa có giáo trình nào thuộc môn học này được xuất bản (Published).
                  </span>
                ) : undefined
              }
            >
              <Select showSearch placeholder={selectedClassForCurriculum ? "Chọn giáo trình thuộc môn học của lớp..." : "Chọn giáo trình..."} optionFilterProp="children" className="rounded-xl">
                {modalDirectCurriculums.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.title || c.code} <span className="text-slate-400 text-xs ml-1">({c.code})</span>
                    {c.specializationId && getSpecializationName(c.specializationId) && (
                      <span className="text-purple-600 text-xs ml-1.5 font-normal">
                        • {getSpecializationName(c.specializationId)}
                      </span>
                    )}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="studentIds"
            label={<span>Học sinh cụ thể <span className="text-slate-400 font-normal text-xs">(bỏ trống = toàn bộ học sinh trong lớp)</span></span>}
            extra={!selectedClassForCurriculum ? (
              <div className="text-amber-600 text-xs mt-1 flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span><b>Mẹo:</b> Hãy chọn <b>Lớp học</b> trước để hệ thống tự động lọc học sinh theo lớp, hoặc để trống ô học sinh để giao toàn bộ lớp.</span>
              </div>
            ) : undefined}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder={allStudents.length === 0 ? "Đang tải học sinh..." : (selectedClassForCurriculum ? "Chọn học sinh cụ thể trong lớp (hoặc bỏ trống để giao cả lớp)..." : "Chọn học sinh cụ thể...")}
              optionFilterProp="label"
              className="rounded-xl"
              options={getStudentsForClass(selectedClassForCurriculum).map((s) => ({
                key: s.studentProfile?.id || s.id,
                value: s.studentProfile?.id || s.id,
                label: `${s.fullName || s.code} @${s.code}`,
              }))}
            />
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
              className="rounded-xl px-6 font-semibold shadow-md shadow-cyan-500/20"
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
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
