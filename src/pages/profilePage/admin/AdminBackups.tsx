import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DatabaseOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  createBackup,
  downloadBackup,
  getBackups,
  type BackupOverview,
  type LocalBackup,
} from "../../../services/backups";
import BackupSyncSettings from "./BackupSyncSettings";
import BackupScheduleSettings from "./BackupScheduleSettings";

function formatSize(bytes: number) {
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function AdminBackups() {
  const { message } = App.useApp();
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [action, setAction] = useState<"create" | LocalBackup | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const mounted = useRef(true);
  const fetching = useRef(false);

  const refresh = useCallback(async () => {
    if (!mounted.current || fetching.current) return;
    fetching.current = true;
    setLoading(true);
    try {
      const value = await getBackups();
      if (mounted.current) {
        setOverview(value);
        setConnectionError(false);
      }
    } catch {
      // A consistent backup briefly stops API writers; keep polling through maintenance.
      if (mounted.current) setConnectionError(true);
    } finally {
      fetching.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5_000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const busy =
    overview?.request.state === "queued" ||
    overview?.request.state === "running";

  const confirm = async () => {
    if (!action || !password || submitting) return;
    const selected = action;
    const confirmation = password;
    setSubmitting(true);
    try {
      if (selected === "create") {
        await createBackup(confirmation);
        if (mounted.current) {
          setOverview(
            (value) => value && { ...value, request: { state: "queued" } },
          );
          void message.success("Đã gửi yêu cầu tạo bản sao lưu.");
        }
      } else {
        setDownloading(true);
        setProgress(0);
        await downloadBackup(selected, confirmation, (percent) => {
          if (mounted.current) setProgress(percent);
        });
        if (mounted.current)
          void message.success(
            "File đã được chuyển đến trình tải xuống của trình duyệt.",
          );
      }
      if (mounted.current) {
        setAction(null);
        setPassword("");
      }
      await refresh();
    } catch (error) {
      if (mounted.current)
        void message.error(
          error instanceof Error
            ? error.message
            : "Thao tác thất bại, vui lòng thử lại.",
        );
    } finally {
      if (mounted.current) {
        setSubmitting(false);
        setDownloading(false);
        setPassword("");
      }
    }
  };

  return (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          Sao lưu dữ liệu
        </Space>
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph>
          Tải bản sao lưu về máy và giữ ở nơi an toàn. File gồm cơ sở dữ liệu,
          học liệu và các file đã tải lên. Cấu hình máy chủ, mật khẩu hệ thống
          và bản build website được lưu riêng.
        </Typography.Paragraph>
        <Alert
          type="warning"
          showIcon
          title="File tải về chưa được mã hóa"
          description="Bạn sẽ nhập lại mật khẩu quản trị để xác nhận thao tác. Đây không phải mật khẩu mở file; người có file có thể đọc dữ liệu bên trong. Bản còn trên VPS cũng không bảo vệ được dữ liệu khi VPS bị mất."
        />
        {connectionError && (
          <Alert
            type="info"
            showIcon
            title="Tạm thời chưa kết nối được máy chủ"
            description="Website có thể đang bảo trì để tạo bản sao lưu. Trang sẽ tự kiểm tra lại; nếu tình trạng kéo dài, hãy liên hệ người vận hành."
          />
        )}
        {overview && !overview.enabled && (
          <Alert
            type="warning"
            showIcon
            title="Chức năng sao lưu chưa được cấu hình"
            description="Người vận hành cần thiết lập thư mục lưu trữ và tiến trình sao lưu trên VPS theo hướng dẫn triển khai."
          />
        )}
        {busy && (
          <Alert
            type="info"
            showIcon
            title={
              overview?.request.state === "queued"
                ? "Đang chờ máy chủ tạo bản sao lưu"
                : "Đang tạo bản sao lưu"
            }
            description="Website có thể tạm thời bảo trì. Không cần bấm tạo thêm; trang sẽ tự cập nhật sau khi hoàn tất. Nếu yêu cầu chờ quá lâu, hãy liên hệ người vận hành."
          />
        )}
        {overview?.request.state === "failed" && (
          <Alert
            type="error"
            showIcon
            title="Lần sao lưu gần nhất thất bại"
            description={
              overview.request.message ||
              "Vui lòng liên hệ người vận hành để kiểm tra."
            }
          />
        )}
        {overview?.request.state === "completed" && (
          <Tag color="success">Bản sao lưu mới đã sẵn sàng</Tag>
        )}
        <Space wrap>
          <Button
            type="primary"
            icon={<DatabaseOutlined />}
            disabled={
              !overview?.enabled || busy || submitting || connectionError
            }
            onClick={() => {
              setPassword("");
              setAction("create");
            }}
          >
            Tạo bản sao lưu mới
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => {
              void refresh();
            }}
          >
            Làm mới
          </Button>
        </Space>
        {downloading && <Progress percent={progress} />}
        <Table<LocalBackup>
          rowKey="id"
          dataSource={overview?.backups ?? []}
          loading={loading && !overview}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 760 }}
          locale={{
            emptyText: <Empty description="Chưa có bản sao lưu để tải" />,
          }}
          columns={[
            {
              title: "Thời điểm tạo",
              dataIndex: "createdAt",
              render: (value: string) =>
                new Date(value).toLocaleString("vi-VN"),
            },
            { title: "Dung lượng", dataIndex: "sizeBytes", render: formatSize },
            {
              title: "Mã kiểm tra SHA-256",
              dataIndex: "sha256",
              render: (value: string) => (
                <Typography.Text copyable={{ text: value }} code>
                  {value.slice(0, 12)}…
                </Typography.Text>
              ),
            },
            {
              title: "Thao tác",
              render: (_: unknown, item: LocalBackup) => (
                <Button
                  icon={<DownloadOutlined />}
                  disabled={busy || submitting || connectionError}
                  onClick={() => {
                    setPassword("");
                    setAction(item);
                  }}
                >
                  Tải về máy
                </Button>
              ),
            },
          ]}
        />
        <BackupScheduleSettings enabled={overview?.enabled === true} />
        <BackupSyncSettings enabled={overview?.enabled === true} />
        <Typography.Text type="secondary">
          Tạo bản mới có thể làm website bảo trì ngắn. Tải bản đã có không cần
          dừng website.
        </Typography.Text>
      </Space>
      <Modal
        open={action !== null}
        title={
          action === "create"
            ? "Xác nhận tạo bản sao lưu"
            : "Xác nhận tải bản sao lưu"
        }
        okText={action === "create" ? "Tạo bản sao lưu" : "Tải về máy"}
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={{ disabled: !password }}
        closable={!submitting}
        maskClosable={!submitting}
        onOk={() => {
          void confirm();
        }}
        onCancel={() => {
          if (!submitting) {
            setAction(null);
            setPassword("");
          }
        }}
      >
        <Typography.Paragraph>
          Nhập lại mật khẩu tài khoản quản trị của bạn. File sao lưu chứa toàn
          bộ dữ liệu và chưa được mã hóa.
          {action === "create" &&
            " Website sẽ tạm thời bảo trì trong lúc tạo bản sao lưu."}
        </Typography.Paragraph>
        <Input.Password
          aria-label="Mật khẩu quản trị hiện tại"
          autoComplete="current-password"
          placeholder="Mật khẩu quản trị hiện tại"
          value={password}
          maxLength={1024}
          disabled={submitting}
          onChange={(event) => setPassword(event.target.value)}
          onPressEnter={() => {
            void confirm();
          }}
        />
      </Modal>
    </Card>
  );
}
