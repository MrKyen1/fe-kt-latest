import { ContentSkeleton } from "../../../components/LoadingRegion";
import Table from "../../../components/Table";
import { useServerPagination } from "../../../hooks/useServerPagination";
import { ServerSelect } from "../../../components/ServerSelect";
import { mapUserResponse } from "../../../services/userService";
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
  Tag,
  Tabs,
  Typography,
  message,
  Statistic,
  Tooltip,
  Progress,
  Alert,
  Segmented,
  DatePicker} from "antd";
import dayjs from "dayjs";
import { SafeSelect } from "../../../components/SafeSelect";

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
  EditOutlined,
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
  center?: { id?: string; name?: string };
  name?: string;
  centerId?: string;
  specializationId?: string;
  specialization?: { id?: string; name?: string };
}
interface StudentOption {
  id: string;
  fullName?: string;
  code?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  startDate?: string;
  citizenId?: string;
  address?: string;
  studentProfile?: {
    id?: string;
    parentFullName?: string;
    birthYear?: number;
    classes?: { id: string; name?: string; centerId?: string; class?: { id: string; name?: string; centerId?: string } }[];
  };
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

  const studentPage = useServerPagination(`/learning/teacher/curriculum-assignments/${assignmentId}/analytics/students`, {}, 8, open && !!assignmentId);
  const studentsList = studentPage.data;
  useEffect(() => { setData(studentPage.meta?.summary ?? null); setLoading(studentPage.loading); }, [studentPage.meta, studentPage.loading]);

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={<div className="flex items-center gap-2 text-purple-700"><BarChartOutlined /><span className="font-bold">Thống kê giáo trình học được giao</span></div>}
      centered
      maskClosable={false}
      width={780}
      className="rounded-3xl overflow-hidden"
      styles={{ body: { maxHeight: "74vh", overflowY: "auto", padding: "16px 24px" } }}
    >
      {loading && !data ? <ContentSkeleton variant="stats" /> : data ? (
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
                <span className="text-xs text-slate-400 font-normal">Tổng {studentPage.total} học sinh</span>
              </div>
              <Table
                size="small"
                pagination={studentPage.pagination}
                rowKey="studentId"
                scroll={{ x: 600 }}
                loading={studentPage.loading}
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
  const { user, refreshProfile, hasPermission } = useAuth();
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

  const handleExamSelectionChange = async (ids: string[]) => { setSelectedExamIds(ids); };

  // ==================== USER CENTERS & SPECIALIZATIONS ====================
  const teacherClassIds = useMemo(() => {
    const list1 = user?.teacherProfile?.classes?.map((c: any) => c.id || c.classId) ?? [];
    const list2 = user?.teacher?.classes?.map((c: any) => c.classId || c.id) ?? [];
    const list3 = (user?.teacherProfile as any)?.classIds ?? [];
    return Array.from(new Set([...list1, ...list2, ...list3].filter(Boolean)));
  }, [user]);

  const userCenters = useMemo(() => {
    const set = new Set<string>();
    if (user?.centerId) set.add(user.centerId);
    if (user?.teacherProfile?.centerId) set.add(user.teacherProfile.centerId);
    if ((user?.teacher as any)?.centerId) set.add((user.teacher as any).centerId);
    (user?.teacherProfile?.classes ?? []).forEach((c: any) => {
      const cid = c.centerId || c.center?.id || c.class?.centerId || c.class?.center?.id;
      if (cid) set.add(cid);
    });
    (user?.teacher?.classes ?? []).forEach((c: any) => {
      const cid = c.centerId || c.center?.id || c.class?.centerId || c.class?.center?.id;
      if (cid) set.add(cid);
    });
    // Match with allClasses as well
    allClasses.filter((c) => teacherClassIds.includes(c.id)).forEach((c) => {
      if (c.centerId) set.add(c.centerId);
    });
    return Array.from(set);
  }, [user, allClasses, teacherClassIds]);

  const displayCenters = useMemo(() => {
    if (isTeacher) {
      const matched = centers.filter((c) => userCenters.includes(c.id));
      if (matched.length > 0) return matched;
      if (user?.centerId) {
        const fallback = centers.filter((c) => c.id === user.centerId);
        if (fallback.length > 0) return fallback;
      }
      return [];
    }
    return centers;
  }, [isTeacher, centers, userCenters, user?.centerId]);

  const teacherSpecializationIds = useMemo(() => {
    const set = new Set<string>();
    (user?.teacherProfile?.specializationIds ?? []).forEach((id: string) => set.add(id));
    (user?.teacherProfile?.specializations ?? []).forEach((s: any) => set.add(s.id));
    (user?.teacher?.teacherSpecializations ?? []).forEach((ts: any) => {
      if (ts.specializationId) set.add(ts.specializationId);
      if (ts.specialization?.id) set.add(ts.specialization.id);
    });
    (allClasses ?? []).forEach((c: any) => {
      if (teacherClassIds.includes(c.id) && c.specializationId) {
        set.add(c.specializationId);
      }
    });
    return Array.from(set);
  }, [user, allClasses, teacherClassIds]);

  const examPage = useServerPagination("/learning/teacher/exam-assignments", {
    centerId: assignmentScope === "all" || selectedCenterId === "all" ? undefined : selectedCenterId, includeStudents: false,
    search: searchKeyword.trim() || undefined,
  }, 10, activeTab === "exam");
  const curriculumPage = useServerPagination("/learning/teacher/curriculum-assignments", {
    centerId: assignmentScope === "all" || selectedCenterId === "all" ? undefined : selectedCenterId, includeStudents: false,
    search: searchKeyword.trim() || undefined,
  }, 10, activeTab === "curriculum");
  const remember = (setter: any) => (records: any[]) => setter((previous: any[]) =>
    Array.from(new Map([...previous, ...records].map(row => [row.id, row])).values()));
  useEffect(() => { setExamAssignments(examPage.data); }, [examPage.data]);
  useEffect(() => { setCurriculumAssignments(curriculumPage.data); }, [curriculumPage.data]);
  useEffect(() => {
    setLoading(activeTab === "exam" ? examPage.loading : curriculumPage.loading);
    const error = activeTab === "exam" ? examPage.error : curriculumPage.error;
    if (error) message.error(error.message);
  }, [activeTab, examPage.loading, curriculumPage.loading, examPage.error, curriculumPage.error]);
  useEffect(() => {
    const profileClasses = user?.teacherProfile?.classes || [];
    setAllClasses(profileClasses); setClasses(profileClasses);
    setSpecializations(user?.teacherProfile?.specializations || []);
    setCenters(Array.from(new Map(profileClasses.filter((row: any) => row.center).map((row: any) => [row.center.id, row.center])).values()) as Center[]);
  }, [user]);

  // ==================== LOAD DATA ====================
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    if (activeTab === "exam") examPage.reload(); else curriculumPage.reload();
  };

  // Auto initialize selectedCenterId based on user context
  useEffect(() => {
    if (!centerInitialized && centers.length > 0) {
      if (isTeacher) {
        if (userCenters.length > 0) {
          setSelectedCenterId(userCenters[0]);
        } else if (user?.centerId) {
          setSelectedCenterId(user.centerId);
        } else if (displayCenters.length > 0) {
          setSelectedCenterId(displayCenters[0].id);
        }
      } else {
        setSelectedCenterId("all");
      }
      setCenterInitialized(true);
    }
  }, [centers, userCenters, user?.centerId, centerInitialized, isTeacher, displayCenters]);

  // Ensure teacher never has an invalid centerId or 'all' when they only have 1 center
  useEffect(() => {
    if (isTeacher && centerInitialized && userCenters.length > 0) {
      if (selectedCenterId !== "all" && !userCenters.includes(selectedCenterId)) {
        setSelectedCenterId(userCenters[0]);
      } else if (selectedCenterId === "all" && userCenters.length === 1) {
        setSelectedCenterId(userCenters[0]);
      }
    }
  }, [isTeacher, centerInitialized, userCenters, selectedCenterId]);

  // ==================== HELPER RESOLVERS ====================
  const getCenterName = (centerId?: string) => {
    if (!centerId) return undefined;
    return centers.find((c) => c.id === centerId)?.name
      || allClasses.find((c: any) => c.center?.id === centerId)?.center?.name
      || (user?.teacherProfile?.classes || []).find((c: any) => c.center?.id === centerId)?.center?.name;
  };

  const getSpecializationName = (specId?: string) => {
    if (!specId) return undefined;
    return specializations.find((s) => s.id === specId)?.name
      || allClasses.find((c: any) => c.specialization?.id === specId)?.specialization?.name
      || (user?.teacherProfile?.specializations || []).find((s: any) => s.id === specId)?.name;
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

  const filteredExamAssignments = examAssignments;
  const filteredCurriculumAssignments = curriculumAssignments;

  // Helper to resolve all class IDs for a student
  const getStudentClassIds = useCallback((student: StudentOption): string[] => {
    const profile = student.studentProfile as any;
    if (!profile) return [];
    const ids = new Set<string>();
    if (Array.isArray(profile.classIds)) {
      profile.classIds.forEach((id: string) => ids.add(id));
    }
    if (Array.isArray(profile.classes)) {
      profile.classes.forEach((c: any) => {
        const cid = c.classId || c.id || c.class?.id;
        if (cid) ids.add(cid);
      });
    }
    return Array.from(ids);
  }, []);

  // ==================== MODAL OPTIONS ====================
  const teacherAssignedClasses = useMemo(() => {
    if (!isTeacher) return [];

    const classMap = new Map<string, any>();

    // 1. From allClasses that match teacherClassIds
    allClasses.filter((c) => teacherClassIds.includes(c.id)).forEach((c) => {
      const spec = specializations.find((s) => s.id === c.specializationId);
      classMap.set(c.id, {
        ...c,
        specializationName: spec?.name || (c as any).specialization?.name,
      });
    });

    // 2. From user?.teacher?.classes (Auth profile)
    (user?.teacher?.classes || [])
      .filter((tc: any) => tc.isActive !== false && tc.class && tc.class.isActive !== false)
      .forEach((tc: any) => {
        const cid = tc.classId || tc.class?.id;
        if (cid) {
          const spec = specializations.find((s) => s.id === (tc.class.specializationId || tc.specializationId));
          classMap.set(cid, {
            id: cid,
            name: tc.class.name,
            centerId: tc.class.centerId || tc.centerId,
            specializationId: tc.class.specializationId || tc.specializationId,
            center: tc.class.center,
            specialization: tc.class.specialization,
            specializationName: spec?.name || tc.class.specialization?.name,
          });
        }
      });

    // 3. Fallback from user?.teacherProfile?.classes
    (user?.teacherProfile?.classes || []).forEach((c: any) => {
      const cid = c.id || c.classId;
      if (cid && !classMap.has(cid)) {
        const spec = specializations.find((s) => s.id === c.specializationId);
        classMap.set(cid, {
          ...c,
          id: cid,
          specializationName: spec?.name || c.specialization?.name,
        });
      }
    });

    let teacherClasses = Array.from(classMap.values());

    // Filter by selected center if specific center selected
    if (selectedCenterId && selectedCenterId !== "all") {
      teacherClasses = teacherClasses.filter((c) => c.centerId === selectedCenterId);
    } else if (userCenters.length > 0) {
      teacherClasses = teacherClasses.filter((c) => c.centerId && userCenters.includes(c.centerId));
    }

    return teacherClasses;
  }, [isTeacher, allClasses, teacherClassIds, user, specializations, selectedCenterId, userCenters]);

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
      const cls = assignableClasses.find((c) => c.id === selectedClassForExam) || allClasses.find((c) => c.id === selectedClassForExam);
      const classSpecId = cls?.specializationId || (cls as any)?.specialization?.id;
      if (classSpecId) {
        return exams.filter((e) => e.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return exams.filter((e) => e.specializationId && teacherSpecializationIds.includes(e.specializationId));
    }
    return exams;
  }, [exams, selectedClassForExam, assignableClasses, allClasses, isTeacher, teacherSpecializationIds]);

  const modalDirectCurriculums = useMemo(() => {
    if (selectedClassForCurriculum) {
      const cls = assignableClasses.find((c) => c.id === selectedClassForCurriculum) || allClasses.find((c) => c.id === selectedClassForCurriculum);
      const classSpecId = cls?.specializationId || (cls as any)?.specialization?.id;
      if (classSpecId) {
        return curriculums.filter((c) => c.specializationId === classSpecId);
      }
    }
    if (isTeacher && teacherSpecializationIds.length > 0) {
      return curriculums.filter((c) => c.specializationId && teacherSpecializationIds.includes(c.specializationId));
    }
    return curriculums;
  }, [curriculums, selectedClassForCurriculum, assignableClasses, allClasses, isTeacher, teacherSpecializationIds]);

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
    const defaultCenter = isTeacher && userCenters.length > 0 ? userCenters[0] : (isTeacher && user?.centerId ? user.centerId : "all");
    setSelectedCenterId(defaultCenter);
    setAssignmentScope(isTeacher ? "my" : "center");
    setSearchKeyword("");
  };

  /**
   * Lọc học sinh theo lớp và trung tâm.
   * Với giáo viên: CHỈ hiển thị học sinh thuộc các lớp do giáo viên phụ trách tại trung tâm của giáo viên.
   */
  const getStudentsForClass = (classId?: string) => {
    let list = allStudents;

    if (isTeacher) {
      // 1. Học sinh bắt buộc phải thuộc ít nhất 1 lớp mà giáo viên này phụ trách
      list = list.filter((s) => {
        const studentClassIds = getStudentClassIds(s);
        return studentClassIds.some((cid) => teacherClassIds.includes(cid));
      });

      // 2. Khóa học sinh theo trung tâm của giáo viên
      const activeCenterId = selectedCenterId !== "all" ? selectedCenterId : userCenters[0];
      if (activeCenterId) {
        list = list.filter((s) => {
          const studentClassIds = getStudentClassIds(s);
          return studentClassIds.some((cid) => {
            const cls = allClasses.find((c) => c.id === cid);
            return cls && cls.centerId === activeCenterId;
          });
        });
      }

      // 3. Nếu đã chọn lớp cụ thể, lọc đúng học sinh của lớp đó
      if (classId) {
        return list.filter((s) => getStudentClassIds(s).includes(classId));
      }
      return list;
    }

    // Với Admin / Quản lý
    const activeCenterId = selectedCenterId !== "all" ? selectedCenterId : undefined;
    if (activeCenterId) {
      list = list.filter((s) => {
        const studentClassIds = getStudentClassIds(s);
        return studentClassIds.some((cid) => {
          const cls = allClasses.find((c) => c.id === cid);
          return cls && cls.centerId === activeCenterId;
        });
      });
    }

    if (classId) {
      return list.filter((s) => getStudentClassIds(s).includes(classId));
    }
    return list;
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

    const resolvedStudentIds = rawStudentIds;

    try {
      setSubmitting(true);
      await teacherLearningService.curriculumAssignments.create({
        curriculumId: values.curriculumId,
        studentIds: resolvedStudentIds.length ? Array.from(new Set(resolvedStudentIds)) : undefined,
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
      width: 240,
      render: (_: any, record: any) => {
        const examItems = record.exams || [];
        const titleStr = record.title;
        return (
          <div className="max-w-[230px]">
            {titleStr && (
              <Tooltip title={titleStr} placement="topLeft">
                <div className="font-semibold text-slate-800 mb-1 truncate cursor-pointer hover:text-indigo-600 transition-colors">
                  {titleStr}
                </div>
              </Tooltip>
            )}
            <div className="text-slate-600 text-sm space-y-1">
              {examItems.map((item: any, idx: number) => {
                const examTitle = item.exam?.title || item.exam?.code || item.examId;
                return (
                  <div key={item.examId || idx} className={titleStr ? "pl-2 border-l-2 border-slate-200" : ""}>
                    <Tooltip title={examTitle} placement="topLeft">
                      <div className={`truncate cursor-pointer hover:text-indigo-600 transition-colors ${titleStr ? "text-xs font-normal" : "font-semibold text-slate-800"}`}>
                        {examTitle}
                      </div>
                    </Tooltip>
                    {item.exam?.code && (
                      <Tooltip title={item.exam.code}>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{item.exam.code}</div>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
              {examItems.length === 0 && !titleStr && <span className="text-slate-400">—</span>}
            </div>
          </div>
        );
      },
    },
    {
      title: "Lớp học",
      width: 140,
      render: (_: any, record: any) => {
        const className = record.class?.name;
        if (!className) return <span className="text-slate-400 text-sm">—</span>;
        return (
          <Tooltip title={className} placement="topLeft">
            <Tag color="blue" className="rounded-full max-w-[130px] truncate inline-block align-middle cursor-pointer">
              {className}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Người giao",
      width: 160,
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
          <div className="flex items-center gap-1.5 flex-nowrap max-w-[150px]">
            {teacherName ? (
              <Tooltip title={teacherName} placement="topLeft">
                <span className="text-sm text-slate-700 truncate inline-block cursor-pointer">
                  {teacherName}
                </span>
              </Tooltip>
            ) : (
              <span className="text-sm text-slate-400">—</span>
            )}
            {isMe && (
              <Tag color="purple" className="rounded-full px-1.5 py-0 border-none text-[10px] font-bold shrink-0">
                Tôi
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Đối tượng",
      width: 130,
      render: (_: any, record: any) => {
        const students = record.students || [];
        const studentList = students.length > 0 ? students : (record.studentIds || []).map((id: string) => ({ studentId: id }));
        const cnt = record.studentCount ?? record.studentIds?.length ?? studentList.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto pr-1">
              {studentList.map((s: any, idx: number) => {
                const name = resolveStudentName(s);
                const statusText = s.status === "finished" ? "Đã hoàn thành" : s.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu";
                return (
                  <div key={s.id || idx} className="truncate">
                    <span className="font-medium">{name}</span>: <span className="font-semibold text-emerald-300">{statusText}</span>
                  </div>
                );
              })}
            </div>
          );
          const content = (
            <span className="text-sm text-slate-600 truncate inline-block cursor-pointer">
              <UserOutlined className="mr-1 text-indigo-400" />
              {cnt} học sinh
            </span>
          );
          return <Tooltip title={tooltipContent} placement="topLeft">{content}</Tooltip>;
        }
        return <span className="text-sm text-slate-600 whitespace-nowrap"><TeamOutlined className="mr-1 text-emerald-400" />Toàn bộ lớp</span>;
      },
    },
    {
      title: "Hình thức",
      width: 120,
      align: "center" as const,
      render: (_: any, record: any) => {
        const examItems = record.exams || [];
        const isExam = examItems.some((e: any) => e.exam?.examType === "exam");
        return isExam ? (
          <Tag color="purple" className="rounded-full border-none text-xs font-semibold m-0">
            Đề kiểm tra
          </Tag>
        ) : (
          <Tag color="blue" className="rounded-full border-none text-xs font-semibold m-0">
            Đề ôn tập
          </Tag>
        );
      },
    },
    {
      title: "Trạng thái",
      width: 130,
      align: "center" as const,
      render: (_: any, record: any) => statusTag(record.status),
    },
    {
      title: "Ngày tạo",
      width: 110,
      align: "center" as const,
      render: (_: any, record: any) => {
        const d = record.createdAt || record.created_at;
        return d ? (
          <Tooltip title={dayjs(d).format("HH:mm:ss DD/MM/YYYY")}>
            <span className="text-xs text-slate-400 cursor-default">{new Date(d).toLocaleDateString("vi-VN")}</span>
          </Tooltip>
        ) : "—";
      },
    },
    {
      title: "Thao tác",
      width: 85,
      align: "center" as const,
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
      width: 250,
      render: (_: any, record: any) => {
        const titleStr = record.title || record.curriculum?.title || record.curriculum?.code || "—";
        const codeStr = record.curriculum?.code;
        return (
          <div className="max-w-[240px]">
            <Tooltip title={titleStr} placement="topLeft">
              <div className="font-semibold text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors">
                {titleStr}
              </div>
            </Tooltip>
            {codeStr && (
              <Tooltip title={codeStr}>
                <div className="text-xs text-slate-400 font-mono truncate">{codeStr}</div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Lớp học",
      width: 140,
      render: (_: any, record: any) => {
        const className = record.class?.name;
        if (!className) return <span className="text-slate-400 text-sm">—</span>;
        return (
          <Tooltip title={className} placement="topLeft">
            <Tag color="purple" className="rounded-full max-w-[130px] truncate inline-block align-middle cursor-pointer">
              {className}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Người giao",
      width: 160,
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
          <div className="flex items-center gap-1.5 flex-nowrap max-w-[150px]">
            {teacherName ? (
              <Tooltip title={teacherName} placement="topLeft">
                <span className="text-sm text-slate-700 truncate inline-block cursor-pointer">
                  {teacherName}
                </span>
              </Tooltip>
            ) : (
              <span className="text-sm text-slate-400">—</span>
            )}
            {isMe && (
              <Tag color="purple" className="rounded-full px-1.5 py-0 border-none text-[10px] font-bold shrink-0">
                Tôi
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Đối tượng",
      width: 130,
      render: (_: any, record: any) => {
        const students = record.students || [];
        const studentList = students.length > 0 ? students : (record.studentIds || []).map((id: string) => ({ studentId: id }));
        const cnt = record.studentCount ?? record.studentIds?.length ?? studentList.length;
        if (cnt) {
          const tooltipContent = (
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto pr-1">
              {studentList.map((s: any, idx: number) => {
                const name = resolveStudentName(s);
                const statusText = s.status === "finished" ? "Đã hoàn thành" : s.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu";
                return (
                  <div key={s.id || idx} className="truncate">
                    <span className="font-medium">{name}</span>: <span className="font-semibold text-purple-300">{statusText}</span>
                  </div>
                );
              })}
            </div>
          );
          const content = (
            <span className="text-sm text-slate-600 truncate inline-block cursor-pointer">
              <UserOutlined className="mr-1 text-purple-400" />
              {cnt} học sinh
            </span>
          );
          return <Tooltip title={tooltipContent} placement="topLeft">{content}</Tooltip>;
        }
        return <span className="text-sm text-slate-600 whitespace-nowrap"><TeamOutlined className="mr-1 text-emerald-400" />Toàn bộ lớp</span>;
      },
    },
    {
      title: "Trạng thái",
      width: 130,
      align: "center" as const,
      render: (_: any, record: any) => statusTag(record.status),
    },
    {
      title: "Ngày tạo",
      width: 110,
      align: "center" as const,
      render: (_: any, record: any) => {
        const d = record.createdAt || record.created_at;
        return d ? (
          <Tooltip title={dayjs(d).format("HH:mm:ss DD/MM/YYYY")}>
            <span className="text-xs text-slate-400 cursor-default">{new Date(d).toLocaleDateString("vi-VN")}</span>
          </Tooltip>
        ) : "—";
      },
    },
    {
      title: "Thao tác",
      width: 85,
      align: "center" as const,
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

  // ==================== STUDENT MANAGEMENT ====================
  const reloadStudents = async () => { setAllStudents([]); };

  // ==================== RENDER ====================
  return (
    <ConfigProvider
      theme={{
        token: { borderRadius: 12, colorPrimary: "#0891b2", fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
        components: { Table: { headerBg: "#f8fafc", headerColor: "#475569", rowHoverBg: "#f1f5f9" } },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={false} size="large">
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
                    <ServerSelect endpoint="/centers" onRecords={remember(setCenters)}
                      value={selectedCenterId}
                      onChange={(val) => setSelectedCenterId(val)}
                      className="min-w-[210px]"
                      options={
                        isTeacher
                          ? displayCenters.length > 1
                            ? [
                                { value: "all", label: "Tất cả trung tâm của bạn" },
                                ...displayCenters.map((c) => ({
                                  value: c.id,
                                  label: (
                                    <div className="flex items-center gap-2 justify-between">
                                      <span className="truncate max-w-[180px]">{c.name}</span>
                                      <Tag color="cyan" className="rounded-full text-[10px] py-0 px-1.5 m-0 font-medium">
                                        Của bạn
                                      </Tag>
                                    </div>
                                  ),
                                })),
                              ]
                            : displayCenters.map((c) => ({
                                value: c.id,
                                label: (
                                  <div className="flex items-center gap-2 justify-between">
                                    <span className="truncate max-w-[180px]">{c.name}</span>
                                    <Tag color="cyan" className="rounded-full text-[10px] py-0 px-1.5 m-0 font-medium">
                                      Của bạn
                                    </Tag>
                                  </div>
                                ),
                              }))
                          : [
                              { value: "all", label: "Tất cả trung tâm (All)" },
                              ...displayCenters.map((c) => ({
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
                            ]
                      }
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
                      options={isTeacher ? [{ label: "Bài của tôi", value: "my" }] : [
                        { label: "Theo trung tâm", value: "center" }, { label: "Tất cả hệ thống", value: "all" },
                      ]}
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
                  {(
                    (isTeacher ? (userCenters.length > 0 && selectedCenterId !== userCenters[0]) : selectedCenterId !== "all") ||
                    (isTeacher ? assignmentScope !== "my" : assignmentScope !== "center") ||
                    searchKeyword
                  ) && (
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
                  {activeTab === "exam" && `Hiển thị ${filteredExamAssignments.length} / ${examPage.total} bài thi`}
                  {activeTab === "curriculum" && `Hiển thị ${filteredCurriculumAssignments.length} / ${curriculumPage.total} giáo trình đã giao`}
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
                        {filteredExamAssignments.length === 0 && !examPage.loading ? (
                          <div className="py-16 text-center">
                            <Empty description={<span className="text-slate-400">Không tìm thấy bài thi nào phù hợp với bộ lọc hiện tại.<br />Hãy đổi bộ lọc hoặc nhấn "Giao Bài Thi Mới".</span>} />
                          </div>
                        ) : (
                          <Table
                            loading={examPage.loading}
                            dataSource={filteredExamAssignments}
                            columns={examAssignmentColumns}
                            rowKey="id"
                            pagination={examPage.pagination}
                            bordered={false}
                            scroll={{ x: 1000 }}
                            className="rounded-2xl overflow-hidden"
                          />
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
                        {filteredCurriculumAssignments.length === 0 && !curriculumPage.loading ? (
                          <div className="py-16 text-center">
                            <Empty description={<span className="text-slate-400">Không tìm thấy giáo trình nào được giao phù hợp với bộ lọc hiện tại.<br />Hãy đổi bộ lọc hoặc nhấn "Giao Giáo Trình Mới".</span>} />
                          </div>
                        ) : (
                          <Table
                            loading={curriculumPage.loading}
                            dataSource={filteredCurriculumAssignments}
                            columns={curriculumAssignmentColumns}
                            rowKey="id"
                            pagination={curriculumPage.pagination}
                            bordered={false}
                            scroll={{ x: 1000 }}
                            className="rounded-2xl overflow-hidden"
                          />
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
            <ServerSelect endpoint="/classes" query={{ centerId: selectedCenterId === "all" ? undefined : selectedCenterId }}
              placeholder="Chọn lớp học..." allowClear className="rounded-xl"
              onRecords={rows => { remember(setAllClasses)(rows); remember(setClasses)(rows); }}
              options={assignableClasses.map(row => ({ label: row.name, value: row.id }))}
              onChange={handleClassChangeForExam} />
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
              <ServerSelect endpoint="/learning/exams" mode="multiple"
                query={{ status: "published", specializationId: getClassSpecializationId(selectedClassForExam) }}
                optionLabel={row => `${row.examType === "exam" ? "[Kiểm tra]" : "[Ôn tập]"} ${row.title || row.code}`}
                onRecords={remember(setExams)} onChange={handleExamSelectionChange}
                options={exams.map(row => ({ label: row.title || row.code, value: row.id }))}
                placeholder="Chọn bài thi..." className="rounded-xl" />
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
                      <ServerSelect endpoint={`/learning/exams/${examId}/versions`}
                        allowClear placeholder="Phiên bản hiện tại" optionLabel={row => `v${row.versionNumber}`} />
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          )}

          <Form.Item
            name="studentIds"
            label={<span>Học sinh cụ thể <span className="text-slate-400 font-normal text-xs">(bỏ trống = toàn bộ lớp)</span></span>}
            extra={!selectedClassForExam ? (
              <div className="text-amber-600 text-xs mt-1 flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span><b>Mẹo:</b> Hãy chọn <b>Lớp học</b> trước để hệ thống tự động lọc đúng học sinh thuộc lớp bạn phụ trách.</span>
              </div>
            ) : undefined}
          >
            <ServerSelect endpoint="/users" mode="multiple"
              query={{ roleCode: "student", classId: selectedClassForExam, centerId: selectedCenterId === "all" ? undefined : selectedCenterId }}
              optionValue={row => row.student?.id || row.studentProfile?.id || row.id}
              optionLabel={row => `${row.fullName} @${row.code}`}
              onRecords={rows => remember(setAllStudents)(rows.map(mapUserResponse))}
              options={allStudents.map(row => ({ label: row.fullName || row.code, value: row.studentProfile?.id || row.id }))}
              placeholder="Tìm học sinh (bỏ trống để giao cả lớp)" className="rounded-xl" />
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
            <ServerSelect endpoint="/classes" query={{ centerId: selectedCenterId === "all" ? undefined : selectedCenterId }}
              placeholder="Chọn lớp học..." allowClear className="rounded-xl"
              onRecords={rows => { remember(setAllClasses)(rows); remember(setClasses)(rows); }}
              options={assignableClasses.map(row => ({ label: row.name, value: row.id }))}
              onChange={handleClassChangeForCurriculum} />
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
              <ServerSelect endpoint="/learning/curriculums"
                query={{ status: "published", specializationId: getClassSpecializationId(selectedClassForCurriculum) }}
                onRecords={remember(setCurriculums)} options={curriculums.map(row => ({ label: row.title || row.code, value: row.id }))}
                placeholder="Chọn giáo trình..." className="rounded-xl" />
            </Form.Item>
          </div>

          <Form.Item
            name="studentIds"
            label={<span>Học sinh cụ thể <span className="text-slate-400 font-normal text-xs">(bỏ trống = toàn bộ lớp)</span></span>}
            extra={!selectedClassForCurriculum ? (
              <div className="text-amber-600 text-xs mt-1 flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span><b>Mẹo:</b> Hãy chọn <b>Lớp học</b> trước để hệ thống tự động lọc học sinh theo lớp, hoặc để trống ô học sinh để giao toàn bộ lớp.</span>
              </div>
            ) : undefined}
          >
            <ServerSelect endpoint="/users" mode="multiple"
              query={{ roleCode: "student", classId: selectedClassForCurriculum, centerId: selectedCenterId === "all" ? undefined : selectedCenterId }}
              optionValue={row => row.student?.id || row.studentProfile?.id || row.id}
              optionLabel={row => `${row.fullName} @${row.code}`}
              onRecords={rows => remember(setAllStudents)(rows.map(mapUserResponse))}
              options={allStudents.map(row => ({ label: row.fullName || row.code, value: row.studentProfile?.id || row.id }))}
              placeholder="Tìm học sinh (bỏ trống để giao cả lớp)" className="rounded-xl" />
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
