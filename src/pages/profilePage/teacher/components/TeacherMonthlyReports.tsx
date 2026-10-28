import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Select,
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
  Modal,
  Alert,
  Progress,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  FileExcelOutlined,
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  UserOutlined,
  BookOutlined,
  TeamOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  MonthlyReportData,
  MonthlyReportStudent,
  MonthlyReportSkill,
  MonthlyReportSnapshotMetadata,
  MonthlyReportSnapshotDetail,
} from "../../../../types/learning";
import { teacherLearningService } from "../../../../services/teacherLearningService";
import { apiClient, getErrorMessage } from "../../../../services/apiClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { userService } from "../../../../services/userService";

const { Title, Text } = Typography;

interface Props {
  classes?: Array<{ id: string; name: string; specializationId?: string }>;
  specializations?: Array<{ id: string; name: string }>;
}

export const TeacherMonthlyReports: React.FC<Props> = ({
  classes: initialClasses = [],
  specializations: initialSpecializations = [],
}) => {
  // Current date
  const now = dayjs();
  const currentYear = now.year();
  const currentMonth = now.month() + 1; // 1-12

  // Filter state
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [specializationId, setSpecializationId] = useState<string | undefined>(undefined);

  // Active top tab: "live" | "snapshots"
  const [activeTab, setActiveTab] = useState<"live" | "snapshots">("live");

  // Options state
  const [classesList, setClassesList] = useState(initialClasses);
  const [specializationsList, setSpecializationsList] = useState(initialSpecializations);
  const [studentsInClass, setStudentsInClass] = useState<Array<{ id: string; fullName: string; code?: string }>>([]);

  // Fetch classes & specializations if not provided
  useEffect(() => {
    if (initialClasses.length === 0) {
      apiClient.get<any>("/classes?limit=100").then((res) => {
        const rows = res.data?.data?.items || res.data?.data || [];
        setClassesList(rows);
      }).catch(() => {});
    } else {
      setClassesList(initialClasses);
    }
  }, [initialClasses]);

  useEffect(() => {
    if (initialSpecializations.length === 0) {
      apiClient.get<any>("/specializations?isActive=true&limit=100").then((res) => {
        const rows = res.data?.data?.items || res.data?.data || [];
        setSpecializationsList(rows);
      }).catch(() => {});
    } else {
      setSpecializationsList(initialSpecializations);
    }
  }, [initialSpecializations]);

  // When classId changes, load students of this class
  useEffect(() => {
    if (!classId) {
      setStudentsInClass([]);
      setStudentId(undefined);
      return;
    }
    apiClient.get<any>(`/classes/${classId}/students`).then((res) => {
      const rows = res.data?.data?.items || res.data?.data || [];
      const mapped = rows.map((r: any) => ({
        id: r.student?.id || r.id,
        fullName: r.student?.fullName || r.fullName || "Học sinh",
        code: r.student?.code || r.code || "",
      }));
      setStudentsInClass(mapped);
    }).catch(() => {
      setStudentsInClass([]);
    });
  }, [classId]);

  // Live report data & pagination
  const [liveReport, setLiveReport] = useState<MonthlyReportData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Load live report
  const loadLiveReport = useCallback(async (targetPage = 1) => {
    try {
      setLiveLoading(true);
      const res = await teacherLearningService.monthlyReports.get({
        year,
        month,
        classId: classId || undefined,
        studentId: studentId || undefined,
        specializationId: specializationId || undefined,
        page: targetPage,
        limit: pageSize,
      });
      setLiveReport(res.data);
      setTotal(res.meta?.total ?? res.data.students?.length ?? 0);
      setPage(targetPage);
    } catch (err) {
      message.error(getErrorMessage(err, "Không thể tải báo cáo tháng"));
      setLiveReport(null);
    } finally {
      setLiveLoading(false);
    }
  }, [year, month, classId, studentId, specializationId, pageSize]);

  // Reload live report when filters change (resets to page 1)
  useEffect(() => {
    if (activeTab === "live") {
      loadLiveReport(1);
    }
  }, [year, month, classId, studentId, specializationId, activeTab, loadLiveReport]);

  // Snapshots list & pagination
  const [snapshots, setSnapshots] = useState<MonthlyReportSnapshotMetadata[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsPage, setSnapshotsPage] = useState(1);
  const [snapshotsPageSize, setSnapshotsPageSize] = useState(20);
  const [snapshotsTotal, setSnapshotsTotal] = useState(0);

  const loadSnapshots = useCallback(async (targetPage = 1) => {
    try {
      setSnapshotsLoading(true);
      const res = await teacherLearningService.monthlyReports.listSnapshots({
        year,
        month,
        classId: classId || undefined,
        studentId: studentId || undefined,
        specializationId: specializationId || undefined,
        page: targetPage,
        limit: snapshotsPageSize,
      });
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as any)?.data)
          ? (res.data as any).data
          : [];
      setSnapshots(rawList);
      setSnapshotsTotal(res.meta?.total ?? rawList.length);
      setSnapshotsPage(targetPage);
    } catch (err) {
      message.error(getErrorMessage(err, "Không thể tải danh sách bản lưu"));
      setSnapshots([]);
    } finally {
      setSnapshotsLoading(false);
    }
  }, [year, month, classId, studentId, specializationId, snapshotsPageSize]);

  const { user: currentUser } = useAuth();
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTab === "snapshots") {
      loadSnapshots(1);
    }
  }, [activeTab, loadSnapshots]);

  // Load creator names for snapshots
  useEffect(() => {
    if (activeTab !== "snapshots" || !snapshots.length) return;
    const idsToFetch = Array.from(
      new Set(
        snapshots
          .map((s) => s.createdByUserId)
          .filter((id) => id && id !== currentUser?.id && !creatorNames[id])
      )
    );
    if (!idsToFetch.length) return;

    let isMounted = true;
    Promise.all(
      idsToFetch.map(async (uid) => {
        try {
          const u = await userService.get(uid);
          return { uid, name: u.fullName || u.username || u.email || "Giáo viên" };
        } catch {
          return { uid, name: "Giáo viên" };
        }
      })
    ).then((res) => {
      if (!isMounted) return;
      setCreatorNames((prev) => {
        const next = { ...prev };
        res.forEach((r) => {
          next[r.uid] = r.name;
        });
        return next;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab, snapshots, currentUser, creatorNames]);

  // Safe Excel blob download helper with error unwrap
  const downloadExcel = async (fetchBlob: () => Promise<Blob>, defaultFileName: string) => {
    try {
      const blob = await fetchBlob();
      // Check if blob is actually an error JSON
      if (blob.type === "application/json" || blob.type.includes("json")) {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          message.error(json.message || "Tải file thất bại");
          return;
        } catch {
          // not JSON, continue
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success("Xuất file báo cáo Excel thành công!");
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          message.error(json.message || "Xuất báo cáo thất bại");
          return;
        } catch {}
      }
      message.error(getErrorMessage(err, "Không thể tải file báo cáo"));
    }
  };

  // Export Live Excel
  const [exportingLive, setExportingLive] = useState(false);
  const handleExportLive = async () => {
    try {
      setExportingLive(true);
      await downloadExcel(
        () =>
          teacherLearningService.monthlyReports.export({
            year,
            month,
            classId: classId || undefined,
            studentId: studentId || undefined,
            specializationId: specializationId || undefined,
          }),
        `bao-cao-hoc-tap-${year}-${String(month).padStart(2, "0")}.xlsx`,
      );
    } finally {
      setExportingLive(false);
    }
  };

  // Create Snapshot
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const handleCreateSnapshot = () => {
    Modal.confirm({
      title: "Lưu / Chốt báo cáo tháng này?",
      content: (
        <div className="space-y-2 text-slate-600 text-sm">
          <p>
            Hệ thống sẽ lưu lại một bản cố định danh sách học sinh, điểm số lần đầu và sau luyện tập tại thời điểm này.
          </p>
          <p className="font-semibold text-slate-800">
            Tháng báo cáo: Tháng {month}/{year}
          </p>
          <p className="text-xs text-amber-600">
            Bản lưu được bảo toàn vĩnh viễn và không bị ảnh hưởng nếu học sinh làm thêm bài sau này.
          </p>
        </div>
      ),
      okText: "Chốt báo cáo ngay",
      cancelText: "Hủy",
      okButtonProps: { loading: creatingSnapshot },
      onOk: async () => {
        try {
          setCreatingSnapshot(true);
          const snapshot = await teacherLearningService.monthlyReports.createSnapshot({
            year,
            month,
            classId: classId || undefined,
            studentId: studentId || undefined,
            specializationId: specializationId || undefined,
          });
          message.success("Đã chốt bản lưu báo cáo thành công!");
          // Switch to snapshots tab and load
          setActiveTab("snapshots");
          loadSnapshots(1);
        } catch (err) {
          message.error(getErrorMessage(err, "Không thể tạo bản lưu báo cáo"));
        } finally {
          setCreatingSnapshot(false);
        }
      },
    });
  };

  // Student Skills Detail Modal / Drawer
  const [selectedStudentForSkills, setSelectedStudentForSkills] = useState<MonthlyReportStudent | null>(null);

  // Snapshot Detail Modal / Drawer
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);
  const [snapshotDetail, setSnapshotDetail] = useState<MonthlyReportSnapshotDetail | null>(null);
  const [snapshotLoadingDetail, setSnapshotLoadingDetail] = useState(false);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [snapshotTotal, setSnapshotTotal] = useState(0);

  const loadSnapshotDetail = async (id: string, targetPage = 1) => {
    try {
      setSnapshotLoadingDetail(true);
      const res = await teacherLearningService.monthlyReports.getSnapshot(id, targetPage, 20);
      setSnapshotDetail(res.data);
      setSnapshotTotal(res.meta?.total ?? res.data.report?.students?.length ?? 0);
      setSnapshotPage(targetPage);
    } catch (err) {
      message.error(getErrorMessage(err, "Không thể tải chi tiết bản lưu"));
    } finally {
      setSnapshotLoadingDetail(false);
    }
  };

  const handleOpenSnapshotDetail = (id: string) => {
    setViewingSnapshotId(id);
    loadSnapshotDetail(id, 1);
  };

  const handleExportSnapshot = async (id: string) => {
    await downloadExcel(
      () => teacherLearningService.monthlyReports.exportSnapshot(id),
      `bao-cao-chot-${id}.xlsx`,
    );
  };

  // Skills table columns inside skills drawer
  const skillsColumns = [
    {
      title: "Kỹ năng",
      dataIndex: "skillName",
      key: "skillName",
      render: (name: string, row: MonthlyReportSkill) => (
        <span className="font-bold text-slate-800 text-sm">
          {name || (row.metadata === "untagged" ? "Chưa gắn kỹ năng" : "Kỹ năng khác")}
        </span>
      ),
    },
    {
      title: "Nguồn dữ liệu",
      dataIndex: "metadata",
      key: "metadata",
      width: 170,
      render: (meta: string) => {
        switch (meta) {
          case "frozen":
            return <Tag color="success" className="rounded-full font-semibold">Snapshot cố định</Tag>;
          case "untagged":
            return <Tag color="default" className="rounded-full">Chưa gắn kỹ năng</Tag>;
          case "legacy_current":
            return <Tag color="warning" className="rounded-full font-medium">Dữ liệu cũ - Hiện tại</Tag>;
          case "legacy_unknown":
            return <Tag color="default" className="rounded-full">Dữ liệu cũ - Chưa gắn</Tag>;
          default:
            return <Tag className="rounded-full">{meta}</Tag>;
        }
      },
    },
    {
      title: "Lần đầu làm",
      key: "firstAttempt",
      width: 180,
      render: (_: any, row: MonthlyReportSkill) => (
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-slate-800">{row.correct} / {row.total} câu</span>
            <span className="text-indigo-600 font-extrabold">{row.accuracy}%</span>
          </div>
          <Progress percent={row.accuracy} size="small" strokeColor="#4f46e5" showInfo={false} />
        </div>
      ),
    },
    {
      title: "Sau luyện tập",
      key: "practiceAttempt",
      width: 180,
      render: (_: any, row: MonthlyReportSkill) => (
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-slate-800">{row.practiceCorrect} / {row.practiceTotal} câu</span>
            <span className="text-emerald-600 font-extrabold">{row.practiceAccuracy}%</span>
          </div>
          <Progress percent={row.practiceAccuracy} size="small" strokeColor="#10b981" showInfo={false} />
        </div>
      ),
    },
    {
      title: "Cải thiện",
      key: "improvement",
      width: 110,
      align: "center" as const,
      render: (_: any, row: MonthlyReportSkill) => {
        const diff = Number((row.practiceAccuracy - row.accuracy).toFixed(1));
        if (diff > 0) {
          return (
            <span className="font-extrabold text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <ArrowUpOutlined /> +{diff}%
            </span>
          );
        }
        return <span className="text-slate-400 text-xs font-bold">0%</span>;
      },
    },
  ];

  // Live students table columns
  const liveColumns = [
    {
      title: "Mã học sinh",
      dataIndex: ["student", "code"],
      key: "studentCode",
      width: 120,
      render: (code: string) => (
        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {code || "—"}
        </span>
      ),
    },
    {
      title: "Họ và tên",
      dataIndex: ["student", "fullName"],
      key: "studentName",
      render: (name: string) => (
        <span className="font-bold text-slate-900 text-sm">{name || "—"}</span>
      ),
    },
    {
      title: "Đề được giao",
      dataIndex: "assignedExams",
      key: "assignedExams",
      width: 110,
      align: "center" as const,
      render: (v: number) => <span className="font-extrabold text-slate-800 text-sm">{v ?? 0}</span>,
    },
    {
      title: "Chưa làm",
      dataIndex: "notStartedExams",
      key: "notStartedExams",
      width: 100,
      align: "center" as const,
      render: (v: number) => (
        <span className="text-slate-500 font-semibold text-xs px-2 py-0.5 rounded-md bg-slate-50">
          {v ?? 0}
        </span>
      ),
    },
    {
      title: "Đang làm",
      dataIndex: "inProgressExams",
      key: "inProgressExams",
      width: 100,
      align: "center" as const,
      render: (v: number) => (
        <span className="text-amber-700 font-semibold text-xs px-2 py-0.5 rounded-md bg-amber-50">
          {v ?? 0}
        </span>
      ),
    },
    {
      title: "Đã hoàn thành",
      dataIndex: "finishedExams",
      key: "finishedExams",
      width: 120,
      align: "center" as const,
      render: (v: number) => (
        <span className="text-emerald-700 font-extrabold text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
          {v ?? 0}
        </span>
      ),
    },
    {
      title: "Tỷ lệ đúng lần đầu",
      key: "accuracy",
      width: 180,
      render: (_: any, row: MonthlyReportStudent) => {
        if (row.accuracy == null) {
          return (
            <Tag color="default" className="rounded-full text-xs font-medium">
              Chưa có dữ liệu
            </Tag>
          );
        }
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">{row.correctAnswers}/{row.totalQuestions} câu</span>
              <span className="font-extrabold text-indigo-600">{row.accuracy}%</span>
            </div>
            <Progress percent={row.accuracy} size="small" strokeColor="#4f46e5" showInfo={false} />
          </div>
        );
      },
    },
    {
      title: "Sau luyện tập",
      key: "afterPractice",
      width: 180,
      render: (_: any, row: MonthlyReportStudent) => {
        const ap = row.afterPractice;
        if (ap?.percentage == null) {
          return (
            <Tag color="default" className="rounded-full text-xs font-medium">
              Chưa có dữ liệu
            </Tag>
          );
        }
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">{ap.correctCount}/{ap.totalQuestions} câu</span>
              <span className="font-extrabold text-emerald-600">{ap.percentage}%</span>
            </div>
            <Progress percent={ap.percentage} size="small" strokeColor="#10b981" showInfo={false} />
          </div>
        );
      },
    },
    {
      title: "Kỹ năng",
      key: "skillsAction",
      width: 140,
      align: "center" as const,
      render: (_: any, row: MonthlyReportStudent) => (
        <Button
          size="small"
          icon={<BarChartOutlined />}
          onClick={() => setSelectedStudentForSkills(row)}
          className="rounded-lg font-bold text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400"
        >
          Phân tích ({row.skills?.length ?? 0})
        </Button>
      ),
    },
  ];

  // Snapshots table columns
  const snapshotsColumns = [
    {
      title: "Thời điểm chốt",
      key: "statusAsOf",
      width: 180,
      render: (_: any, row: MonthlyReportSnapshotMetadata) => {
        const timeStr = dayjs(row.statusAsOf || row.createdAt).format("DD/MM/YYYY HH:mm");
        const creatorName =
          (row as any).createdByUser?.fullName ||
          (row as any).createdByUser?.username ||
          (row.createdByUserId === currentUser?.id
            ? currentUser?.fullName || "Bạn (Giáo viên)"
            : creatorNames[row.createdByUserId] || "Giáo viên");

        return (
          <Tooltip title={`Lưu bởi giáo viên: ${creatorName}`} placement="topLeft">
            <span className="font-bold text-slate-900 text-sm block cursor-default">
              {timeStr}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Tháng báo cáo",
      key: "period",
      width: 150,
      render: (_: any, row: MonthlyReportSnapshotMetadata) => (
        <Tag color="cyan" className="rounded-full font-bold px-3 py-0.5 text-xs">
          Tháng {row.month}/{row.year}
        </Tag>
      ),
    },
    {
      title: "Phạm vi lưu",
      key: "filters",
      render: (_: any, row: MonthlyReportSnapshotMetadata) => {
        const f = row.filters || {};
        const matchedClass = f.classId ? classesList.find((c) => c.id === f.classId) : null;
        const matchedSpec = f.specializationId ? specializationsList.find((s) => s.id === f.specializationId) : null;

        const className = matchedClass ? matchedClass.name : f.classId ? `Lớp ${f.classId.slice(0, 8)}...` : null;
        const specName = matchedSpec ? matchedSpec.name : f.specializationId ? `Môn ${f.specializationId.slice(0, 8)}...` : null;

        return (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {className ? (
              <Tag color="blue" className="rounded-md">Lớp: {className}</Tag>
            ) : (
              <Tag color="default" className="rounded-md">Toàn bộ lớp</Tag>
            )}
            {specName && (
              <Tag color="purple" className="rounded-md">Môn: {specName}</Tag>
            )}
            {f.studentId && (
              <Tag color="orange" className="rounded-md">Học sinh riêng</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 220,
      align: "center" as const,
      render: (_: any, row: MonthlyReportSnapshotMetadata) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenSnapshotDetail(row.id)}
            className="rounded-lg font-bold text-indigo-600 border-indigo-200"
          >
            Xem bản lưu
          </Button>
          <Button
            size="small"
            icon={<FileExcelOutlined />}
            onClick={() => handleExportSnapshot(row.id)}
            className="rounded-lg font-bold text-emerald-700 border-emerald-200 bg-emerald-50/50"
          >
            Xuất Excel
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* FILTER BAR: YEAR, MONTH, CLASS, STUDENT, SPECIALIZATION  */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Year */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Năm báo cáo
            </label>
            <Select
              value={year}
              onChange={(y) => setYear(y)}
              className="w-full"
              options={[2024, 2025, 2026, 2027, 2028].map((y) => ({
                label: `Năm ${y}`,
                value: y,
              }))}
            />
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Tháng
            </label>
            <Select
              value={month}
              onChange={(m) => setMonth(m)}
              className="w-full"
              options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                label: `Tháng ${m}`,
                value: m,
              }))}
            />
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Lớp học
            </label>
            <Select
              value={classId}
              onChange={(c) => {
                setClassId(c);
                setStudentId(undefined);
              }}
              allowClear
              placeholder="Tất cả các lớp"
              className="w-full"
              options={classesList.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </div>

          {/* Student */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Học sinh
            </label>
            <Select
              value={studentId}
              onChange={(s) => setStudentId(s)}
              allowClear
              disabled={!classId}
              placeholder={classId ? "Tất cả học sinh" : "Chọn lớp trước"}
              className="w-full"
              options={studentsInClass.map((s) => ({
                label: `${s.fullName} ${s.code ? `(${s.code})` : ""}`,
                value: s.id,
              }))}
            />
          </div>

          {/* Specialization / Subject */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Môn học
            </label>
            <Select
              value={specializationId}
              onChange={(s) => setSpecializationId(s)}
              allowClear
              placeholder="Tất cả môn học"
              className="w-full"
              options={specializationsList.map((s) => ({
                label: s.name,
                value: s.id,
              }))}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN CONTENT: TABS (LIVE REPORT vs SNAPSHOTS)            */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs space-y-4">
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          type="card"
          tabBarExtraContent={
            activeTab === "live" ? (
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadLiveReport(page)}
                  loading={liveLoading}
                  className="rounded-xl font-semibold"
                >
                  Làm mới
                </Button>
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  onClick={handleExportLive}
                  loading={exportingLive}
                  className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm"
                >
                  Xuất file Excel
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleCreateSnapshot}
                  loading={creatingSnapshot}
                  className="rounded-xl font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:border-indigo-400"
                >
                  Lưu / Chốt báo cáo
                </Button>
              </Space>
            ) : (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadSnapshots(snapshotsPage)}
                loading={snapshotsLoading}
                className="rounded-xl font-semibold"
              >
                Làm mới danh sách
              </Button>
            )
          }
          items={[
            {
              key: "live",
              label: (
                <span className="font-bold flex items-center gap-2 px-2 py-1">
                  <BarChartOutlined />
                  Báo cáo trực tiếp (Live)
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  {/* Status header alert */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <ClockCircleOutlined className="text-indigo-600 text-sm" />
                      <span>
                        Các đề thi được giao trong{" "}
                        <strong className="text-slate-900">
                          Tháng {month}/{year}
                        </strong>{" "}
                        — Số liệu kết quả cập nhật thực tế đến lúc:{" "}
                        <strong className="text-slate-900 font-mono">
                          {liveReport?.statusAsOf
                            ? dayjs(liveReport.statusAsOf).format("DD/MM/YYYY HH:mm:ss")
                            : "—"}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Múi giờ: {liveReport?.timeZone || "Asia/Ho_Chi_Minh"}</span>
                    </div>
                  </div>

                  {/* Students Table */}
                  <Table
                    columns={liveColumns}
                    dataSource={liveReport?.students || []}
                    rowKey={(record) => record.student.id}
                    loading={liveLoading}
                    pagination={{
                      current: page,
                      pageSize,
                      total,
                      onChange: (p, ps) => {
                        setPageSize(ps);
                        loadLiveReport(p);
                      },
                      showTotal: (t) => `Tổng cộng ${t} học sinh`,
                    }}
                    scroll={{ x: 1100 }}
                    className="rounded-2xl overflow-hidden"
                  />
                </div>
              ),
            },
            {
              key: "snapshots",
              label: (
                <span className="font-bold flex items-center gap-2 px-2 py-1">
                  <HistoryOutlined />
                  Bản lưu cố định (Snapshots)
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <Alert
                    type="info"
                    showIcon
                    className="rounded-2xl"
                    message="Bản lưu báo cáo tháng (Snapshots)"
                    description="Các bản lưu cố định toàn bộ số liệu học sinh và kỹ năng tại thời điểm chốt. Dữ liệu này không bị thay đổi khi học sinh tiếp tục làm bài hoặc chuyển lớp."
                  />

                  <Table
                    columns={snapshotsColumns}
                    dataSource={Array.isArray(snapshots) ? snapshots : []}
                    rowKey="id"
                    loading={snapshotsLoading}
                    pagination={{
                      current: snapshotsPage,
                      pageSize: snapshotsPageSize,
                      total: snapshotsTotal,
                      onChange: (p, ps) => {
                        setSnapshotsPageSize(ps);
                        loadSnapshots(p);
                      },
                      showTotal: (t) => `Tổng cộng ${t} bản lưu`,
                    }}
                    className="rounded-2xl overflow-hidden"
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ======================================================== */}
      {/* DRAWER: STUDENT SKILLS BREAKDOWN                         */}
      {/* ======================================================== */}
      <Drawer
        open={!!selectedStudentForSkills}
        onClose={() => setSelectedStudentForSkills(null)}
        width={780}
        title={
          selectedStudentForSkills ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <UserOutlined />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-base">
                  {selectedStudentForSkills.student.fullName}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Mã: {selectedStudentForSkills.student.code || "—"}
                </div>
              </div>
            </div>
          ) : (
            "Phân tích kỹ năng học sinh"
          )
        }
        className="rounded-l-2xl"
      >
        {selectedStudentForSkills && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 block mb-1">
                  Đúng lần đầu (Chính thức)
                </span>
                <div className="text-2xl font-black text-indigo-900">
                  {selectedStudentForSkills.accuracy != null
                    ? `${selectedStudentForSkills.accuracy}%`
                    : "Chưa có dữ liệu"}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Đạt {selectedStudentForSkills.correctAnswers} / {selectedStudentForSkills.totalQuestions} câu
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">
                  Tiến độ sau luyện tập
                </span>
                <div className="text-2xl font-black text-emerald-900">
                  {selectedStudentForSkills.afterPractice?.percentage != null
                    ? `${selectedStudentForSkills.afterPractice.percentage}%`
                    : "Chưa có dữ liệu"}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Đạt {selectedStudentForSkills.afterPractice?.correctCount ?? 0} /{" "}
                  {selectedStudentForSkills.afterPractice?.totalQuestions ?? 0} câu
                </div>
              </div>
            </div>

            {/* Skills Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Thống kê theo từng kỹ năng ({selectedStudentForSkills.skills?.length ?? 0})
                </h4>
                <span className="text-xs text-slate-400">
                  Sắp xếp theo tỷ lệ đúng giảm dần
                </span>
              </div>

              <Table
                columns={skillsColumns}
                dataSource={selectedStudentForSkills.skills || []}
                rowKey={(r) => `${r.skillId || "noskill"}_${r.metadata}`}
                pagination={false}
                size="middle"
                className="rounded-xl overflow-hidden border border-slate-200/80"
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* ======================================================== */}
      {/* MODAL / DRAWER: VIEW SNAPSHOT DETAIL                     */}
      {/* ======================================================== */}
      <Drawer
        open={!!viewingSnapshotId}
        onClose={() => {
          setViewingSnapshotId(null);
          setSnapshotDetail(null);
        }}
        width={980}
        title={
          snapshotDetail ? (
            <div className="flex items-center justify-between gap-4 pr-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                  <HistoryOutlined />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">
                    Chi tiết Bản lưu Tháng {snapshotDetail.month}/{snapshotDetail.year}
                  </div>
                  <div className="text-xs text-slate-500">
                    Chốt lúc: {dayjs(snapshotDetail.statusAsOf || snapshotDetail.createdAt).format("DD/MM/YYYY HH:mm")}
                  </div>
                </div>
              </div>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => handleExportSnapshot(snapshotDetail.id)}
                className="rounded-xl font-bold text-emerald-700 bg-emerald-50 border-emerald-200"
              >
                Xuất Excel bản lưu này
              </Button>
            </div>
          ) : (
            "Chi tiết bản lưu báo cáo"
          )
        }
        className="rounded-l-2xl"
      >
        {snapshotLoadingDetail ? (
          <div className="py-24 text-center">
            <Spin size="large" />
            <div className="mt-3 text-slate-500 font-medium">Đang tải nội dung bản lưu...</div>
          </div>
        ) : !snapshotDetail ? (
          <Empty description="Không tìm thấy nội dung bản lưu" />
        ) : (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              className="rounded-2xl"
              message="Dữ liệu bản lưu đã được chốt cố định"
              description={`Toàn bộ danh sách ${snapshotTotal} học sinh và phân tích kỹ năng được bảo toàn nguyên vẹn kể từ thời điểm chốt.`}
            />

            <Table
              columns={liveColumns}
              dataSource={snapshotDetail.report?.students || []}
              rowKey={(r) => r.student.id}
              pagination={{
                current: snapshotPage,
                pageSize: 20,
                total: snapshotTotal,
                onChange: (p) => loadSnapshotDetail(snapshotDetail.id, p),
                showTotal: (t) => `Tổng cộng ${t} học sinh`,
              }}
              scroll={{ x: 1000 }}
              className="rounded-2xl overflow-hidden"
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TeacherMonthlyReports;
