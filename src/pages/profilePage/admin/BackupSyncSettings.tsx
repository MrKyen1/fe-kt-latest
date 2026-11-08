import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Space,
  Steps,
  Table,
  Typography,
} from "antd";
import { DownloadOutlined, KeyOutlined } from "@ant-design/icons";
import {
  createBackupSyncKey,
  downloadWindowsBackupClient,
  getBackupSyncKeys,
  revokeBackupSyncKey,
  type BackupSyncKey,
} from "../../../services/backups";

export default function BackupSyncSettings({ enabled }: { enabled: boolean }) {
  const { message } = App.useApp();
  const [keys, setKeys] = useState<BackupSyncKey[]>([]);
  const [action, setAction] = useState<"create" | BackupSyncKey | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getBackupSyncKeys()
      .then((value) => {
        if (active) setKeys(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled]);

  const confirm = async () => {
    if (!action || !password || busy) return;
    setBusy(true);
    try {
      if (action === "create") setIssued(await createBackupSyncKey(password));
      else {
        await revokeBackupSyncKey(action.id, password);
        void message.success("Đã thu hồi mã đồng bộ.");
      }
      setAction(null);
      setKeys(await getBackupSyncKeys());
    } catch (error) {
      void message.error(
        error instanceof Error
          ? error.message
          : "Không thực hiện được thao tác.",
      );
    } finally {
      setPassword("");
      setBusy(false);
    }
  };

  const downloadInstaller = async () => {
    try {
      await downloadWindowsBackupClient();
    } catch {
      void message.error("Không tải được bộ cài, vui lòng thử lại.");
    }
  };

  return (
    <Card title="Tự động tải về máy Windows" size="small">
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph>
          Cài một lần để máy Windows tự kiểm tra và tải bản mới nhất mỗi giờ, kể
          cả khi đóng trình duyệt. Máy cần bật, đã đăng nhập Windows và có mạng.
          Không lưu mật khẩu quản trị trong công cụ.
        </Typography.Paragraph>
        <Steps
          size="small"
          orientation="vertical"
          items={[
            {
              title: "Tạo mã đồng bộ",
              content:
                "Nhập lại mật khẩu admin trên website. Mã chỉ cho phép đọc/tải backup và có hạn một năm.",
            },
            {
              title: "Tải và chạy bộ cài Windows",
              content:
                "Tải file bên dưới, bấm chuột phải vào file và chọn Run with PowerShell (Windows 11: chọn Show more options trước). Cửa sổ cài đặt hiện ra để dán mã đồng bộ và chọn thư mục lưu.",
            },
            {
              title: "Để Windows tải tự động",
              content:
                "Không cần nhập lại mật khẩu mỗi giờ. Có thể thu hồi mã tại đây để ngừng quyền tải của máy đó.",
            },
          ]}
        />
        <Space wrap>
          <Button
            icon={<KeyOutlined />}
            disabled={!enabled || busy}
            onClick={() => {
              setPassword("");
              setAction("create");
            }}
          >
            Tạo mã đồng bộ
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!enabled}
            onClick={() => {
              void downloadInstaller();
            }}
          >
            Tải bộ cài Windows
          </Button>
        </Space>
        <Typography.Text type="secondary">
          Không thấy mục Run with PowerShell? Mở PowerShell trong thư mục tải về
          và chạy lệnh:
        </Typography.Text>
        <Typography.Paragraph
          copyable={{
            text: "powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\kata-backup-windows.ps1",
          }}
        >
          <Typography.Text code>
            powershell.exe -NoProfile -ExecutionPolicy Bypass -File
            .\kata-backup-windows.ps1
          </Typography.Text>
        </Typography.Paragraph>
        <Alert
          type="info"
          showIcon
          title="Mã đồng bộ và mật khẩu mở file là hai việc khác nhau"
          description="Windows mã hóa mã đồng bộ theo tài khoản đã cài; các file backup tải về vẫn chưa được mã hóa. Khi đổi mật khẩu admin, đăng xuất mọi thiết bị, mã hết hạn hoặc bị thu hồi, cần tạo mã mới và chạy lại bộ cài."
        />
        <Table<BackupSyncKey>
          size="small"
          rowKey="id"
          dataSource={keys}
          pagination={false}
          scroll={{ x: 540 }}
          locale={{ emptyText: "Chưa cấp mã đồng bộ cho tài khoản này" }}
          columns={[
            {
              title: "Mã nhận diện",
              dataIndex: "id",
              render: (id: string) => (
                <Typography.Text code>{id.slice(0, 12)}…</Typography.Text>
              ),
            },
            {
              title: "Hết hạn",
              dataIndex: "expiresAt",
              render: (value: string) =>
                new Date(value).toLocaleDateString("vi-VN"),
            },
            {
              title: "Thao tác",
              render: (_: unknown, key: BackupSyncKey) => (
                <Button
                  danger
                  disabled={busy}
                  onClick={() => {
                    setPassword("");
                    setAction(key);
                  }}
                >
                  Thu hồi
                </Button>
              ),
            },
          ]}
        />
      </Space>
      <Modal
        open={action !== null}
        title={
          action === "create"
            ? "Cấp mã tải backup tự động"
            : "Thu hồi mã đồng bộ"
        }
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={busy}
        okButtonProps={{ disabled: !password }}
        closable={!busy}
        maskClosable={!busy}
        onOk={() => {
          void confirm();
        }}
        onCancel={() => {
          if (!busy) {
            setAction(null);
            setPassword("");
          }
        }}
      >
        <Typography.Paragraph>
          Nhập mật khẩu tài khoản admin hiện tại để xác nhận.
        </Typography.Paragraph>
        <Input.Password
          value={password}
          maxLength={1024}
          autoComplete="current-password"
          aria-label="Mật khẩu xác nhận mã đồng bộ"
          disabled={busy}
          onChange={(event) => setPassword(event.target.value)}
          onPressEnter={() => {
            void confirm();
          }}
        />
      </Modal>
      <Modal
        open={issued !== null}
        title="Lưu mã đồng bộ cho máy Windows"
        footer={<Button onClick={() => setIssued(null)}>Đã lưu mã</Button>}
        onCancel={() => setIssued(null)}
        maskClosable={false}
      >
        <Alert
          type="warning"
          showIcon
          title="Mã chỉ hiển thị một lần"
          description="Giữ kín mã: người có mã có thể tải toàn bộ backup. Copy và dán vào bộ cài Windows; nếu mất mã, hãy thu hồi rồi tạo mã mới."
        />
        <Typography.Text type="secondary">
          Không thấy mục Run with PowerShell? Mở PowerShell trong thư mục tải về
          và chạy lệnh:
        </Typography.Text>
        <Typography.Paragraph
          copyable={{ text: issued?.token }}
          style={{ marginTop: 16, overflowWrap: "anywhere" }}
        >
          <Typography.Text code>{issued?.token}</Typography.Text>
        </Typography.Paragraph>
        <Typography.Text>
          Hết hạn:{" "}
          {issued && new Date(issued.expiresAt).toLocaleDateString("vi-VN")}
        </Typography.Text>
      </Modal>
    </Card>
  );
}
