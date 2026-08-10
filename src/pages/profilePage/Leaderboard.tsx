import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Table,
  Tag,
  Select,
  Tabs,
  Spin,
  Empty,
  Alert,
  Badge,
  Avatar,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  message,
} from "antd";
import {
  TrophyOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  StarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { leaderboardService } from "../../services/leaderboardService";
import { useAuth } from "../../contexts/AuthContext";
import type {
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardScope,
  LeaderboardScopes,
  LeaderboardSummary,
  LeaderboardSummaryQuery,
} from "../../types/learning";

const { Title, Text } = Typography;
const { Option } = Select;

// ======== Helpers ========

const METRIC_LABELS: Record<LeaderboardMetric, { label: string; icon: React.ReactNode; color: string }> = {
  mastery: { label: "Cao thủ", icon: <CrownOutlined />, color: "#f59e0b" },
  accuracy: { label: "Chính xác", icon: <ThunderboltOutlined />, color: "#6366f1" },
  progress: { label: "Tiến bộ", icon: <RiseOutlined />, color: "#10b981" },
};

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  all_time: "Toàn thời gian",
  month: "Tháng này",
  week: "7 ngày qua",
};

function rankBadge(rank: number) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm">
      {rank}
    </span>
  );
}

function metricValue(entry: LeaderboardEntry, metric: LeaderboardMetric) {
  if (metric === "mastery") return entry.masteryTotal ?? "—";
  if (metric === "accuracy") return entry.avgAccuracy != null ? `${entry.avgAccuracy.toFixed(1)}%` : "—";
  if (metric === "progress") return entry.progressGained ?? "—";
  return "—";
}

function metricLabel(metric: LeaderboardMetric) {
  if (metric === "mastery") return "Câu master";
  if (metric === "accuracy") return "Độ chính xác";
  if (metric === "progress") return "Câu tăng thêm";
  return "";
}

// ======== My Rank Widget ========

interface MyRankWidgetProps {
  summary: LeaderboardSummary | null;
  loading: boolean;
}

function MyRankWidget({ summary, loading }: MyRankWidgetProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl border border-indigo-100 shadow-sm mb-6">
        <div className="flex justify-center py-6"><Spin /></div>
      </Card>
    );
  }
  if (!summary) return null;
  // GV/Admin: tất cả cards đều null
  if (!summary.mastery && !summary.accuracy && !summary.progress) return null;

  const cards = [
    { key: "mastery", data: summary.mastery, ...METRIC_LABELS.mastery },
    { key: "accuracy", data: summary.accuracy, ...METRIC_LABELS.accuracy },
    { key: "progress", data: summary.progress, ...METRIC_LABELS.progress },
  ].filter(c => c.data !== null);

  return (
    <Card
      className="rounded-2xl border border-indigo-100 shadow-sm mb-6 overflow-hidden"
      bodyStyle={{ padding: 0 }}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="flex items-center gap-2 text-white">
          <StarOutlined className="text-yellow-300 text-lg" />
          <span className="font-bold text-lg">Hạng của bạn</span>
          <span className="text-indigo-200 text-sm ml-1">({PERIOD_LABELS[summary.period]})</span>
        </div>
      </div>
      <div className="p-4">
        <Row gutter={[16, 16]}>
          {cards.map((c) => (
            <Col xs={24} sm={8} key={c.key}>
              <div
                className="rounded-xl p-4 flex flex-col gap-1"
                style={{ background: `${c.color}10`, border: `1px solid ${c.color}30` }}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: c.color }}>
                  {c.icon} {c.label}
                </div>
                {c.data?.rank != null ? (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-slate-800">#{c.data.rank}</span>
                    {c.data.value != null && (
                      <span className="text-xs text-slate-400">
                        · {c.data.value}{c.key === "accuracy" ? "%" : " câu"}
                      </span>
                    )}
                  </div>
                ) : c.data?.qualified === false ? (
                  <Tooltip title={`Cần làm thêm ${c.data.examsNeeded} bài để lên bảng`}>
                    <Tag color="orange" className="mt-1 w-fit rounded-full">
                      Cần {c.data.examsNeeded} bài nữa
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color="default" className="mt-1 w-fit rounded-full">Chưa có dữ liệu</Tag>
                )}
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </Card>
  );
}

// ======== Main Leaderboard ========

function getEffectivePeriod(m: LeaderboardMetric, p: LeaderboardPeriod): LeaderboardPeriod {
  if (m === "progress" && p === "all_time") {
    return "month";
  }
  return p;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const isStudent = (user as any)?.role === "student";

  // Scopes
  const [scopes, setScopes] = useState<LeaderboardScopes | null>(null);
  const [scopesLoading, setScopesLoading] = useState(true);

  // Filters
  const [scope, setScope] = useState<LeaderboardScope>("class");
  const [scopeId, setScopeId] = useState<string | undefined>(undefined);
  const [specializationId, setSpecializationId] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<LeaderboardMetric>("mastery");
  const [metricPeriods, setMetricPeriods] = useState<Record<LeaderboardMetric, LeaderboardPeriod>>({
    mastery: "all_time",
    accuracy: "all_time",
    progress: "month",
  });

  const activePeriod = getEffectivePeriod(metric, metricPeriods[metric]);

  // Table data
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // My rank summary
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Load available scopes on mount
  useEffect(() => {
    setScopesLoading(true);
    leaderboardService.getScopes()
      .then((data) => {
        setScopes(data);
        // Auto-select first available scope
        if (data.classes?.length) {
          setScope("class");
          setScopeId(data.classes[0].id);
          setSpecializationId(data.classes[0].specializationId);
        } else if (data.curriculums?.length) {
          setScope("curriculum");
          setScopeId(data.curriculums[0].id);
          setSpecializationId(data.curriculums[0].specializationId);
        } else if (data.centers?.length) {
          setScope("center");
          setScopeId(data.centers[0].id);
          setSpecializationId(data.centers[0].subjects?.[0]?.id);
        } else if (data.assignments?.length) {
          setScope("assignment");
          setScopeId(data.assignments[0].id);
        } else if (data.subjects?.length) {
          setScope("global");
          setSpecializationId(data.subjects[0].id);
        }
      })
      .catch(() => {
        // Silently handle — user may not have any scopes
      })
      .finally(() => setScopesLoading(false));
  }, []);

  // Load leaderboard table
  const loadLeaderboard = useCallback(async () => {
    if (!scope) return;
    if (scope !== "global" && !scopeId) return;
    if ((scope === "center" || scope === "global") && !specializationId) return;

    setLoading(true);
    try {
      const res = await leaderboardService.getLeaderboard({
        scope,
        scopeId: scope === "global" ? undefined : scopeId,
        specializationId,
        metric,
        period: activePeriod,
        page,
        limit: PAGE_SIZE,
      });
      setLeaderboard(res.data);
      setTotal(res.meta?.total ?? 0);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể tải bảng xếp hạng";
      message.error(msg);
      setLeaderboard(null);
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, specializationId, metric, activePeriod, page]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Load personal summary for students
  useEffect(() => {
    if (!isStudent || !scope || (scope !== "global" && !scopeId)) return;
    if ((scope === "center" || scope === "global") && !specializationId) return;

    const summaryPeriod = activePeriod === "all_time" ? "month" : activePeriod;
    const q: LeaderboardSummaryQuery = {
      scope,
      scopeId: scope === "global" ? undefined : scopeId,
      specializationId,
      period: summaryPeriod,
    };
    setSummaryLoading(true);
    leaderboardService.getSummary(q)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [isStudent, scope, scopeId, specializationId, activePeriod]);

  // ---- Scope options ----
  function renderScopeSelector() {
    if (scopesLoading) return <Spin size="small" />;

    const scopeOptions: { value: LeaderboardScope; label: string }[] = [];
    if (scopes?.classes?.length) scopeOptions.push({ value: "class", label: "Lớp học" });
    if (scopes?.assignments?.length) scopeOptions.push({ value: "assignment", label: "Bài kiểm tra" });
    if (scopes?.curriculums?.length) scopeOptions.push({ value: "curriculum", label: "Lộ trình học" });
    if (scopes?.centers?.length) scopeOptions.push({ value: "center", label: "Trung tâm" });
    if (scopes?.subjects?.length) scopeOptions.push({ value: "global", label: "Toàn hệ thống" });

    return (
      <Row gutter={[12, 12]} align="middle" className="mb-4">
        <Col xs={24} sm={6}>
          <Select
            value={scope}
            onChange={(val: LeaderboardScope) => {
              setScope(val);
              setScopeId(undefined);
              setSpecializationId(undefined);
              setPage(1);
            }}
            className="w-full rounded-xl"
            placeholder="Phạm vi"
          >
            {scopeOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        </Col>

        {scope === "class" && scopes?.classes?.length ? (
          <Col xs={24} sm={10}>
            <Select
              value={scopeId}
              onChange={(val: string) => {
                const cls = scopes.classes.find(c => c.id === val);
                setScopeId(val);
                setSpecializationId(cls?.specializationId);
                setPage(1);
              }}
              className="w-full rounded-xl"
              placeholder="Chọn lớp..."
              showSearch
              optionFilterProp="children"
            >
              {scopes.classes.map(c => (
                <Option key={c.id} value={c.id}>
                  {c.name} <span className="text-slate-400 text-xs">({c.subjectName})</span>
                </Option>
              ))}
            </Select>
          </Col>
        ) : null}

        {scope === "assignment" && scopes?.assignments?.length ? (
          <Col xs={24} sm={10}>
            <Select
              value={scopeId}
              onChange={(val: string) => { setScopeId(val); setPage(1); }}
              className="w-full rounded-xl"
              placeholder="Chọn bài kiểm tra..."
              showSearch
              optionFilterProp="children"
            >
              {scopes.assignments.map(a => (
                <Option key={a.id} value={a.id}>{a.title || a.id}</Option>
              ))}
            </Select>
          </Col>
        ) : null}

        {scope === "curriculum" && scopes?.curriculums?.length ? (
          <Col xs={24} sm={10}>
            <Select
              value={scopeId}
              onChange={(val: string) => {
                const cur = scopes.curriculums.find(c => c.id === val);
                setScopeId(val);
                setSpecializationId(cur?.specializationId);
                setPage(1);
              }}
              className="w-full rounded-xl"
              placeholder="Chọn lộ trình..."
              showSearch
              optionFilterProp="children"
            >
              {scopes.curriculums.map(c => (
                <Option key={c.id} value={c.id}>
                  {c.title} <span className="text-slate-400 text-xs">({c.subjectName})</span>
                </Option>
              ))}
            </Select>
          </Col>
        ) : null}

        {scope === "center" && scopes?.centers?.length ? (
          <>
            <Col xs={24} sm={8}>
              <Select
                value={scopeId}
                onChange={(val: string) => {
                  setScopeId(val);
                  setSpecializationId(undefined);
                  setPage(1);
                }}
                className="w-full rounded-xl"
                placeholder="Chọn trung tâm..."
                showSearch
                optionFilterProp="children"
              >
                {scopes.centers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Col>
            {scopeId && (
              <Col xs={24} sm={8}>
                <Select
                  value={specializationId}
                  onChange={(val: string) => { setSpecializationId(val); setPage(1); }}
                  className="w-full rounded-xl"
                  placeholder="Chọn môn..."
                >
                  {scopes.centers.find(c => c.id === scopeId)?.subjects.map(s => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Col>
            )}
          </>
        ) : null}

        {scope === "global" && scopes?.subjects?.length ? (
          <Col xs={24} sm={10}>
            <Select
              value={specializationId}
              onChange={(val: string) => { setSpecializationId(val); setScopeId(undefined); setPage(1); }}
              className="w-full rounded-xl"
              placeholder="Chọn môn..."
            >
              {scopes.subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Col>
        ) : null}

        <Col xs={24} sm={4}>
          <Select
            value={activePeriod}
            onChange={(val: LeaderboardPeriod) => {
              setMetricPeriods((prev) => ({ ...prev, [metric]: val }));
              setPage(1);
            }}
            className="w-full rounded-xl"
          >
            {Object.entries(PERIOD_LABELS)
              .filter(([k]) => !(metric === "progress" && k === "all_time"))
              .map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
          </Select>
        </Col>
      </Row>
    );
  }

  // ---- Table columns ----
  const columns: ColumnsType<LeaderboardEntry> = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 70,
      align: "center",
      render: (rank: number) => rankBadge(rank),
    },
    {
      title: "Học sinh",
      key: "student",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar icon={<UserOutlined />} size={36}
            style={{ background: record.isMe ? "#6366f1" : "#e2e8f0" }}
          />
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              {record.student.fullName}
              {record.isMe && (
                <Tag color="blue" className="rounded-full text-xs border-none px-2">Bạn</Tag>
              )}
            </div>
            <div className="text-slate-400 text-xs">{record.student.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: metricLabel(metric),
      key: "value",
      align: "right",
      render: (_, record) => (
        <span className="font-bold text-base" style={{ color: METRIC_LABELS[metric].color }}>
          {metricValue(record, metric)}
        </span>
      ),
    },
    {
      title: "Số bài đã làm",
      dataIndex: "examsCounted",
      key: "examsCounted",
      align: "center",
      width: 130,
      render: (v: number) => <span className="text-slate-500">{v}</span>,
    },
    {
      title: "Lần làm gần nhất",
      dataIndex: "lastSubmittedAt",
      key: "lastSubmittedAt",
      align: "center",
      width: 160,
      render: (v: string | null) =>
        v ? <span className="text-slate-400 text-xs">{new Date(v).toLocaleDateString("vi-VN")}</span> : "—",
    },
  ];

  // ---- Render ----
  const tabs = [
    { key: "mastery" as LeaderboardMetric, ...METRIC_LABELS.mastery },
    { key: "accuracy" as LeaderboardMetric, ...METRIC_LABELS.accuracy },
    { key: "progress" as LeaderboardMetric, ...METRIC_LABELS.progress },
  ];

  // Hide progress tab for assignment scope (ít ý nghĩa)
  const visibleTabs = scope === "assignment"
    ? tabs.filter(t => t.key === "mastery")
    : tabs;

  const viewer = leaderboard?.viewer;
  const minExamsRequired = leaderboard?.minExamsRequired ?? 1;

  return (
    <div className="space-y-0">
      <Card
        className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.07)] overflow-hidden"
        bodyStyle={{ padding: "24px 24px 0" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            <TrophyOutlined className="text-lg" />
          </div>
          <div>
            <Title level={4} className="!mb-0 !text-slate-800">Bảng Xếp Hạng</Title>
            <Text className="text-slate-400 text-sm">So sánh thành tích học tập với bạn bè</Text>
          </div>
        </div>

        {/* Scope & Period selectors */}
        {renderScopeSelector()}

        {/* Metric tabs */}
        <Tabs
          activeKey={metric}
          onChange={(key) => {
            setMetric(key as LeaderboardMetric);
            setPage(1);
          }}
          items={visibleTabs.map(t => ({
            key: t.key,
            label: (
              <span className="flex items-center gap-1.5 font-semibold px-1">
                <span style={{ color: t.color }}>{t.icon}</span>
                {t.label}
              </span>
            ),
          }))}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Card>

      {/* My rank widget */}
      {isStudent && (
        <div className="mt-4">
          <MyRankWidget summary={summary} loading={summaryLoading} />
        </div>
      )}

      {/* Viewer bar (khi học sinh chưa lọt bảng chính) */}
      {isStudent && viewer && viewer.rank === null && (
        <Alert
          className="rounded-2xl border-indigo-200 mt-3"
          type="info"
          showIcon
          message={
            <span>
              Bạn chưa lọt bảng xếp hạng.{" "}
              {!viewer.qualified && metric === "accuracy" && viewer.examsNeeded > 0 && (
                <strong>Cần làm thêm {viewer.examsNeeded} bài để đủ điều kiện.</strong>
              )}
              {!viewer.qualified && metric === "progress" && (
                <strong>Cần có điểm tiến bộ trong kỳ đã chọn.</strong>
              )}
            </span>
          }
        />
      )}

      {/* Bảng xếp hạng accuracy trống với thông điệp */}
      {!loading && leaderboard?.entries?.length === 0 && (
        <Card className="rounded-2xl border border-slate-100 shadow-sm mt-3">
          <Empty
            description={
              <div className="text-center">
                <div className="text-slate-500 mb-1">Chưa có học sinh nào đủ điều kiện lên bảng.</div>
                {metric === "accuracy" && (
                  <div className="text-slate-400 text-xs">
                    Bảng Chính xác yêu cầu tối thiểu {minExamsRequired} bài đã làm.
                  </div>
                )}
              </div>
            }
          />
        </Card>
      )}

      {/* Table */}
      {(loading || (leaderboard?.entries?.length ?? 0) > 0) && (
        <Card className="rounded-2xl border border-slate-100 shadow-sm mt-3" bodyStyle={{ padding: "0" }}>
          <Table<LeaderboardEntry>
            loading={loading}
            dataSource={leaderboard?.entries ?? []}
            columns={columns}
            rowKey="studentId"
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (p) => setPage(p),
              showTotal: (t) => `${t} học sinh`,
              size: "small",
              showSizeChanger: false,
            }}
            rowClassName={(record) =>
              record.isMe
                ? "bg-indigo-50 hover:bg-indigo-100 font-medium"
                : "hover:bg-slate-50"
            }
            size="middle"
          />
        </Card>
      )}
    </div>
  );
}
